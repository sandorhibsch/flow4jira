// src/lib/flow/processor.test.ts
// Run with: npm test or npx jest

import { processJiraIssue, msToDays } from './processor';
import { JiraIssue, JiraChangelogResponse } from '@/lib/jira/jira-types';

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
      expect(result.flowHistory.length).toBeGreaterThan(0);

      // Find transitions
      const inProgressTransition = result.flowHistory.find(t => t.stage === 'development');
      const deploymentTransition = result.flowHistory.find(t => t.stage === 'deployment');
      const testingTransition = result.flowHistory.find(t => t.stage === 'testing');
      const doneTransition = result.flowHistory.find(t => t.stage === 'done');

      expect(inProgressTransition).toBeDefined();
      expect(deploymentTransition).toBeDefined();
      expect(testingTransition).toBeDefined();
      expect(doneTransition).toBeDefined();
    });

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
      const result = processJiraIssue(issue);
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

      const result = processJiraIssue(issue);
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
        { timestamp: new Date('2024-01-01T10:00:00'), status: 'Work in Progress' },
        { timestamp: completedDate, status: 'Done' }
      ]);

      const result = processJiraIssue(issue, changelog);

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
        { timestamp: inProgressDate, status: 'Work in Progress' },
        { timestamp: completedDate, status: 'Done' }
      ]);

      const result = processJiraIssue(issue, changelog);

      // Cycle time should be ~7 days (from development to done)
      expect(result.cycleTimeDays).toBeCloseTo(7, 0);
    });

    it('should return 0 for cycle time if issue never went development', () => {
      const issue = createMockIssue();

      const changelog = createMockChangelog([
        { timestamp: new Date('2024-01-01T10:00:00'), status: 'Done' }
      ]);

      const result = processJiraIssue(issue, changelog);
      expect(result.cycleTimeDays).toBe(0);
    });

    it('should track first entry dates for each stage', () => {
      const createdDate = new Date('2024-01-01');
      const inProgressDate1 = new Date('2024-01-03T10:00:00');
      const testingDate = new Date('2024-01-05T10:00:00');
      const inProgressDate2 = new Date('2024-01-06T10:00:00'); // Bounced back!
      const doneDate = new Date('2024-01-10T10:00:00');

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
        { timestamp: inProgressDate1, status: 'Work in Progress' },
        { timestamp: testingDate, status: 'To be Tested' },
        { timestamp: inProgressDate2, status: 'Work in Progress' }, // Went back to in-progress
        { timestamp: doneDate, status: 'Done' }
      ]);

      const result = processJiraIssue(issue, changelog);

      // Should track FIRST entry into each stage
      expect(result.flowHistory.find(t => t.stage === 'development')?.enteredAt).toEqual(inProgressDate1)
      expect(result.flowHistory.find(t => t.stage === 'done')?.enteredAt).toEqual(doneDate);

      // Cycle time should be from FIRST in-progress to done
      const expectedCycleTime = msToDays(doneDate.getTime() - inProgressDate1.getTime());
      expect(result.cycleTimeDays).toBeCloseTo(expectedCycleTime, 1);
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