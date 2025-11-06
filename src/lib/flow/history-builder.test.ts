import { JiraChangelogResponse, JiraIssue } from "../jira/jira-types";
import { filterStatusChanges, StatusChange } from "./history-builder";

function createMockIssue(overrides: Partial<JiraIssue> = {}): JiraIssue {
  const baseIssue: JiraIssue = {
    key: 'PROJ-123',
    id: '10000',
    self: 'https://jira.example.com/rest/api/2/issue/10000',
    fields: {
      summary: 'Test issue',
      created: new Date('2024-01-01').toISOString(),
      issuetype: {
        id: '10001',
        name: 'User Story',
        iconUrl: 'https://example.com/icon.png'
      },
      status: {
        id: '10000',
        name: 'Done',
        statusCategory: {
          id: 3,
          key: 'done',
          colorName: 'green',
          name: 'Done'
        }
      },
      resolutiondate: new Date('2024-01-15').toISOString()
    }
  };

  return { ...baseIssue, ...overrides };
}

/**
 * Test helper: Create a mock changelog
 */
function createMockChangelog(transitions: Array<{
  timestamp: Date;
  field: string;
  to: string;
}>): JiraChangelogResponse {
  return {
    self: 'https://jira.example.com/rest/api/2/issue/10000',
    maxResults: 50,
    startAt: 0,
    total: transitions.length,
    isLast: true,
    histories: transitions.map(({ timestamp, field: field, to: to }) => ({
      id: Math.random().toString(),
      created: timestamp.toISOString(),
      author: {
        displayName: 'Test User',
        emailAddress: 'test@example.com'
      },
      items: [{
        field: field,
        fieldtype: 'jira',
        fieldId: 'status',
        from: null,
        fromString: null,
        to: to,
        toString: to
      }]
    }))
  };
}

describe('Status history builder', () => {
  describe('process issue - without changelog', () => {
    it('should handle issue with no changelog', () => {
      const issue = createMockIssue({
        fields: {
          ...createMockIssue().fields,
          status: {
            id: '10000',
            name: 'Backlog',
            statusCategory: {
              id: 3,
              key: 'baclog',
              colorName: 'grey',
              name: 'Backlog'
            }
          }
        }
      });

      const result = filterStatusChanges(issue);

      expect(result.length).toBe(0);
    });

  });

  describe('process issue with changelog', () => {
    it('should return exactly one status change when one transition happened', () => {
      const issue = createMockIssue({ fields: { ...createMockIssue().fields } });
      const changelog = createMockChangelog([
        { timestamp: new Date('2024-01-03T10:00:00'), field: 'status', to: 'Work in Progress' }
      ]);

      const result: StatusChange[] = filterStatusChanges(issue, changelog);

      expect(result.length).toBe(1);
      expect(result[0].to).toBe('Work in Progress');
      expect(result[0].enteredAt.toISOString()).toBe(new Date('2024-01-03T10:00:00').toISOString());
    });

    it('should return status change when issue added to sprint', () => {
      const issue = createMockIssue({ fields: { ...createMockIssue().fields } });
      const changelog = createMockChangelog([
        { timestamp: new Date('2024-01-03T10:00:00'), field: 'Sprint', to: 'Sprint 1' }
      ]);

      const result: StatusChange[] = filterStatusChanges(issue, changelog);

      expect(result.length).toBe(1);
      expect(result[0].to).toBe('Sprint 1');
      expect(result[0].enteredAt.toISOString()).toBe(new Date('2024-01-03T10:00:00').toISOString());
      expect(result[0].isAddedToSprint).toBe(true);
    });

    it('should return false for sprint when change is status', () => {
      const issue = createMockIssue({ fields: { ...createMockIssue().fields } });
      const changelog = createMockChangelog([
        { timestamp: new Date('2024-01-03T10:00:00'), field: 'status', to: 'Work in Progress' }
      ]);

      const result: StatusChange[] = filterStatusChanges(issue, changelog);

      expect(result.length).toBe(1);
      expect(result[0].to).toBe('Work in Progress');
      expect(result[0].enteredAt.toISOString()).toBe(new Date('2024-01-03T10:00:00').toISOString());
      expect(result[0].isAddedToSprint).toBe(false);
    });

    it('should return only status changes', () => {
      const issue = createMockIssue({ fields: { ...createMockIssue().fields } });
      const changelog = createMockChangelog([
        { timestamp: new Date('2024-01-01T10:00:00'), field: 'status', to: 'Work in Progress' },
        { timestamp: new Date('2024-01-02T10:00:00'), field: 'Sprint', to: 'Sprint1' },
        { timestamp: new Date('2024-01-03T10:00:00'), field: 'status', to: 'To be Tested' },
        { timestamp: new Date('2024-01-05T10:00:00'), field: 'status', to: 'Done' },
        { timestamp: new Date('2024-01-02T10:00:00'), field: 'customField', to: 'something' }
      ]);

      const result: StatusChange[] = filterStatusChanges(issue, changelog);

      expect(result.length).toBe(4);
    });

  });
});