// src/lib/flow/processor.test.ts

import { processJiraIssue, msToDays } from './processor';
import { JiraIssue, JiraChangelogResponse } from '@/lib/jira/jira-types';
import { TEST_WORKFLOW } from '../testutils/create-mocks';

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

      const result = processJiraIssue(TEST_WORKFLOW, issue);

      expect(result.key).toBe('PROJ-123');
      expect(result.summary).toBe('Test issue');
      expect(result.currentStatus).toBe('Done');
      expect(result.currentStage.key).toBe('done');
      expect(result.created).toEqual(new Date('2024-01-01'));
    });

  });

  describe('processJiraIssue - with changelog', () => {

    it('should calculate daysOld correctly when issue not done', () => {
      const now = Date.now();
      const createdDate = new Date();
      createdDate.setDate(createdDate.getDate() - 5); // 5 days ago

      const issue = createMockIssue({
        fields: {
          ...createMockIssue().fields,
          status: {
            id: '10001',
            name: 'Work In Progress',
            statusCategory: {
              id: 2,
              key: 'development',
              colorName: 'blue',
              name: 'In Progress'
            }
          },
          created: createdDate.toISOString()
        }
      });

      const expected = (now - createdDate.getTime()) / (1000 * 60 * 60 * 24);
      const result = processJiraIssue(TEST_WORKFLOW, issue);
      expect(result.ageDays).toBe(expected);
    });

    it('should return 0 for daysOld when issue is done', () => {
      const createdDate = new Date();
      createdDate.setDate(createdDate.getDate() - 5); // 5 days ago

      const issue = createMockIssue({
        fields: {
          ...createMockIssue().fields,

          created: createdDate.toISOString()
        }
      });

      const result = processJiraIssue(TEST_WORKFLOW, issue);
      expect(result.ageDays).toBe(0);
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
        { timestamp: new Date('2024-01-01T10:00:00'), status: 'In Progress' },
        { timestamp: completedDate, status: 'Done' }
      ]);

      const result = processJiraIssue(TEST_WORKFLOW, issue, changelog);

      // Lead time should be ~14 days
      expect(result.leadTimeDays).toBeCloseTo(14, 0);
    });

    it('should calculate cycle time (development to done)', () => {
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
        { timestamp: inProgressDate, status: 'In Progress' },
        { timestamp: completedDate, status: 'Done' }
      ]);

      const result = processJiraIssue(TEST_WORKFLOW, issue, changelog);

      // Cycle time should be ~7 days (from development to done)
      expect(result.cycleTimeDays).toBeCloseTo(7, 0);
    });

    it('should return lead time for cycle time if issue never went development', () => {
      const issue = createMockIssue();

      const changelog = createMockChangelog([
        { timestamp: new Date('2024-01-01T10:00:00'), status: 'Done' }
      ]);

      const result = processJiraIssue(TEST_WORKFLOW, issue, changelog);
      expect(result.cycleTimeDays).toBe(1);
    });

    it('should set done date if issue is closed', () => {
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
        { timestamp: inProgressDate, status: 'In Progress' },
        { timestamp: completedDate, status: 'Done' }
      ]);

      const result = processJiraIssue(TEST_WORKFLOW, issue, changelog);

      expect(result.done).toStrictEqual(completedDate);
    });

  });


  describe('msToDays helper', () => {
    it('should convert milliseconds to days adding one', () => {
      const oneDay = 24 * 60 * 60 * 1000;
      expect(msToDays(oneDay)).toBe(1);
      expect(msToDays(oneDay * 7)).toBe(7);
    });

    it('should round to 0 decimal place', () => {
      const oneDayAndHalf = 36 * 60 * 60 * 1000;
      expect(msToDays(oneDayAndHalf)).toBe(2);
    });
  });


});