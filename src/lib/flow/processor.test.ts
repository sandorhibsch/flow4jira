// src/lib/flow/processor.test.ts
// Run with: npm test or npx jest

import { processJiraIssue, msToDays, calculateSummary, ProcessedFlowIssue } from './processor';
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

/**
 * Test helper: Create mock processed issue
 */
function createMockProcessedIssue(overrides: Partial<ProcessedFlowIssue> = {}): ProcessedFlowIssue {
  const baseIssue: ProcessedFlowIssue = {
    key: "PROJ-123",
    summary: "Take out the garbage",
    issueType: "Story",
    created: new Date('2024-01-01'),
    statusHistory: [],
    flowHistory: [],
    currentStage: 'backlog',
    currentStatus: 'Backlog',
    leadTimeDays: 0,
    cycleTimeDays: 0,
    ageDays: 5,
  }

  return { ...baseIssue, ...overrides };
}

/**
 * Test helper: create multiple issues for analysis
 */
function createProcessedIssues(): ProcessedFlowIssue[] {
  const issueOpen = createMockProcessedIssue({
    ...createMockProcessedIssue(),
    currentStage: 'backlog',
    ageDays: 4
  });

  const issueInProgress = createMockProcessedIssue({
    ...createMockProcessedIssue(),
    currentStage: 'development',
    ageDays: 6
  });

  const issueInTesting = createMockProcessedIssue({
    ...createMockProcessedIssue(),
    currentStage: 'testing',
    ageDays: 8
  });

  const issueDone1 = createMockProcessedIssue({
    ...createMockProcessedIssue(),
    currentStage: 'done',
    cycleTimeDays: 6,
    leadTimeDays: 8,
    ageDays: 0
  })

  const issueDone2 = createMockProcessedIssue({
    ...createMockProcessedIssue(),
    currentStage: 'done',
    cycleTimeDays: 8,
    leadTimeDays: 10,
    ageDays: 0
  })

  return [
    issueOpen,
    issueInProgress,
    issueInTesting,
    issueDone1,
    issueDone2
  ]
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
      expect(result.statusHistory.length).toBeGreaterThan(0);

      // Find transitions
      const inProgressTransition = result.statusHistory.find(t => t.stage === 'development');
      const deploymentTransition = result.statusHistory.find(t => t.stage === 'deployment');
      const testingTransition = result.statusHistory.find(t => t.stage === 'testing');
      const doneTransition = result.statusHistory.find(t => t.stage === 'done');

      expect(inProgressTransition).toBeDefined();
      expect(deploymentTransition).toBeDefined();
      expect(testingTransition).toBeDefined();
      expect(doneTransition).toBeDefined();
    });

    it('should calculate daysOld correctly when issue not done', () => {
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

      const result = processJiraIssue(issue);
      expect(result.ageDays).toBe(6);
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

  describe('calculateSummary', () => {
    it('should return total number of issues', () => {
      const issues = createProcessedIssues();

      const result = calculateSummary(issues);

      expect(result.total).toBe(5);
    });

    it('should calculate average age correctly', () => {
      const issueInProgress = createMockProcessedIssue({
        ...createMockProcessedIssue(),
        ageDays: 6
      });

      const issueInTesting = createMockProcessedIssue({
        ...createMockProcessedIssue(),
        ageDays: 8
      });

      const result = calculateSummary([issueInProgress, issueInTesting]);

      expect(result.averageAge).toBe(7);
    });

    it('should exclude done issues from average age calculation', () => {
      const issueInProgress = createMockProcessedIssue({
        ...createMockProcessedIssue(),
        ageDays: 6
      });

      const issueInTesting = createMockProcessedIssue({
        ...createMockProcessedIssue(),
        ageDays: 8
      });

      const issueDone = createMockProcessedIssue({
        ...createMockProcessedIssue(),
        currentStage: 'done',
      })

      const result = calculateSummary([issueInProgress, issueInTesting, issueDone]);

      expect(result.averageAge).toBe(7);
    });

    it('should include not-development issues in average age calculation', () => {
      const issueOpen = createMockProcessedIssue({
        ...createMockProcessedIssue(),
        currentStage: 'backlog',
        ageDays: 4
      });

      const issueInProgress = createMockProcessedIssue({
        ...createMockProcessedIssue(),
        currentStage: 'development',
        ageDays: 6
      });

      const issueInTesting = createMockProcessedIssue({
        ...createMockProcessedIssue(),
        currentStage: 'testing',
        ageDays: 8
      });

      const issueDone = createMockProcessedIssue({
        ...createMockProcessedIssue(),
        currentStage: 'done',
      })

      const result = calculateSummary([issueOpen, issueInProgress, issueInTesting, issueDone]);

      expect(result.averageAge).toBe(6);
    });

    it('should calculate WIP correctly', () => {
      const processedIssues = createProcessedIssues();

      const result = calculateSummary(processedIssues);

      expect(result.workInProgress).toBe(2);
    });

    it('should calculate average Cycletime correctly', () => {
      const processedIssues = createProcessedIssues();

      const result = calculateSummary(processedIssues);

      expect(result.averageCycletime).toBe(7);
    });
  });
});