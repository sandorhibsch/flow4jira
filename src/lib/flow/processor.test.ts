// src/lib/flow/processor.test.ts
// Run with: npm test or npx jest

import { processJiraIssue, msToDays } from './processor';
import { JiraIssue, JiraChangelogResponse } from '@/lib/jira/types';

/**
 * Test helper: Create a mock Jira issue
 */
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
  status: string;
}>): JiraChangelogResponse {
  return {
    self: 'https://jira.example.com/rest/api/2/issue/10000',
    maxResults: 50,
    startAt: 0,
    total: transitions.length,
    isLast: true,
    histories: transitions.map(({ timestamp, status }) => ({
      id: Math.random().toString(),
      created: timestamp.toISOString(),
      author: {
        displayName: 'Test User',
        emailAddress: 'test@example.com'
      },
      items: [{
        field: 'status',
        fieldtype: 'jira',
        fieldId: 'status',
        from: null,
        fromString: null,
        to: status,
        toString: status
      }]
    }))
  };
}

describe('Flow Processor', () => {
  describe('processJiraIssue - without changelog', () => {
    it('should handle issue with no changelog', () => {
      const issue = createMockIssue({
        fields: {
          ...createMockIssue().fields,
          status: {
            id: '10000',
            name: 'Done',
            statusCategory: {
              id: 3,
              key: 'done',
              colorName: 'green',
              name: 'Done'
            }
          }
        }
      });

      const result = processJiraIssue(issue);

      expect(result.key).toBe('PROJ-123');
      expect(result.summary).toBe('Test issue');
      expect(result.currentStatus).toBe('Done');
      expect(result.currentStage).toBe('done');
      expect(result.created).toEqual(new Date('2024-01-01'));
    });

    it('should calculate daysOld correctly', () => {
      const createdDate = new Date();
      createdDate.setDate(createdDate.getDate() - 5); // 5 days ago

      const issue = createMockIssue({
        fields: {
          ...createMockIssue().fields,
          created: createdDate.toISOString()
        }
      });

      const result = processJiraIssue(issue);
      expect(result.daysOld).toBe(5);
    });
  });

  describe('processJiraIssue - with changelog', () => {
    it('should track issue through complete workflow', () => {
      const createdDate = new Date('2024-01-01');

      const issue = createMockIssue({
        fields: {
          ...createMockIssue().fields,
          created: createdDate.toISOString(),
          status: {
            id: '10000',
            name: 'Done',
            statusCategory: {
              id: 3,
              key: 'done',
              colorName: 'green',
              name: 'Done'
            }
          }
        }
      });

      const changelog = createMockChangelog([
        { timestamp: new Date('2024-01-01T10:00:00'), status: 'Work in Progress' },
        { timestamp: new Date('2024-01-02T10:00:00'), status: 'Completed' },
        { timestamp: new Date('2024-01-03T10:00:00'), status: 'To be Tested' },
        { timestamp: new Date('2024-01-05T10:00:00'), status: 'Done' }
      ]);

      const result = processJiraIssue(issue, changelog);

      // Should have transitions through multiple stages
      expect(result.statusHistory.length).toBeGreaterThan(0);

      // Find transitions
      const inProgressTransition = result.statusHistory.find(t => t.stage === 'in-progress');
      const deploymentTransition = result.statusHistory.find(t => t.stage === 'deployment');
      const testingTransition = result.statusHistory.find(t => t.stage === 'testing');
      const doneTransition = result.statusHistory.find(t => t.stage === 'done');

      expect(inProgressTransition).toBeDefined();
      expect(deploymentTransition).toBeDefined();
      expect(testingTransition).toBeDefined();
      expect(doneTransition).toBeDefined();
    });

    it('should calculate lead time correctly', () => {
      const createdDate = new Date('2024-01-01');
      const completedDate = new Date('2024-01-15');

      const issue = createMockIssue({
        fields: {
          ...createMockIssue().fields,
          created: createdDate.toISOString(),
          status: {
            id: '10000',
            name: 'Done',
            statusCategory: {
              id: 3,
              key: 'done',
              colorName: 'green',
              name: 'Done'
            }
          }
        }
      });

      const changelog = createMockChangelog([
        { timestamp: new Date('2024-01-01T10:00:00'), status: 'Work in Progress' },
        { timestamp: completedDate, status: 'Done' }
      ]);

      const result = processJiraIssue(issue, changelog);

      // Lead time should be ~14 days
      const leadTimeDays = msToDays(result.leadTime);
      expect(leadTimeDays).toBeCloseTo(14, 0);
    });

    it('should calculate cycle time (in-progress to done)', () => {
      const createdDate = new Date('2024-01-01');
      const inProgressDate = new Date('2024-01-03');
      const completedDate = new Date('2024-01-10');

      const issue = createMockIssue({
        fields: {
          ...createMockIssue().fields,
          created: createdDate.toISOString(),
          status: {
            id: '10000',
            name: 'Done',
            statusCategory: {
              id: 3,
              key: 'done',
              colorName: 'green',
              name: 'Done'
            }
          }
        }
      });

      const changelog = createMockChangelog([
        { timestamp: inProgressDate, status: 'Work in Progress' },
        { timestamp: completedDate, status: 'Done' }
      ]);

      const result = processJiraIssue(issue, changelog);

      // Cycle time should be ~7 days (from in-progress to done)
      const cycleTimeDays = msToDays(result.cycleTime);
      expect(cycleTimeDays).toBeCloseTo(7, 0);
    });

    it('should return 0 for cycle time if issue never went in-progress', () => {
      const issue = createMockIssue();

      const changelog = createMockChangelog([
        { timestamp: new Date('2024-01-01T10:00:00'), status: 'Done' }
      ]);

      const result = processJiraIssue(issue, changelog);
      expect(result.cycleTime).toBe(0);
    });
  });

  describe('msToDays helper', () => {
    it('should convert milliseconds to days', () => {
      const oneDay = 24 * 60 * 60 * 1000;
      expect(msToDays(oneDay)).toBe(1);
      expect(msToDays(oneDay * 7)).toBe(7);
    });

    it('should round to 1 decimal place', () => {
      const oneDayAndHalf = 36 * 60 * 60 * 1000;
      expect(msToDays(oneDayAndHalf)).toBe(1.5);
    });
  });
});