// src/lib/flow/processor.test.ts

import { processJiraIssue, msToDays } from './processor';
import { createMockChangelog, createMockJiraIssue, createMockWorkflow, TEST_WORKFLOW } from '../testutils/create-mocks';
import { WorkflowDefinition } from '../jira/workflow-config';

describe('Flow Processor', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-15T12:00:00.000Z'));
  });

  afterEach(() => jest.useRealTimers());

  describe('processJiraIssue - without changelog', () => {
    it('should handle issue with no changelog', () => {
      const issue = createMockJiraIssue({
        fields: {
          ...createMockJiraIssue().fields,
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

      const issue = createMockJiraIssue({
        fields: {
          ...createMockJiraIssue().fields,
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

      // msToDays uses Math.ceil, so we need to match that expectation
      const expected = Math.ceil((now - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      const result = processJiraIssue(TEST_WORKFLOW, issue);
      expect(result.ageDays).toBe(expected);
    });

    it('should return 0 for daysOld when issue is done', () => {
      const today = new Date();
      const createdDate = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000);
      const doneDate = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000);

      const issue = createMockJiraIssue({
        fields: {
          ...createMockJiraIssue().fields,

          created: createdDate.toISOString()
        }
      });

      const changelog = createMockChangelog([
        { timestamp: createdDate, status: 'In Progress' },
        { timestamp: doneDate, status: 'Done' },
      ]);

      const result = processJiraIssue(TEST_WORKFLOW, issue, changelog);
      expect(result.ageDays).toBe(0);
    });

    it('should return 0 for daysOld when issue done state before final state', () => {
      const SPECIAL_WORKFLOW: WorkflowDefinition = createMockWorkflow({
        stages: [
          {
            key: 'new',
            name: 'New',
            stageType: 'new',
            jiraStatuses: ['New']
          },
          {
            key: 'release',
            name: 'Release',
            stageType: 'done',
            isCycleEnd: true,
            jiraStatuses: ['Release']
          },
          {
            key: 'closed',
            name: 'Closed',
            stageType: 'done',
            jiraStatuses: ['Closed']
          }
        ]

      });

      const today = new Date();
      const createdDate = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000);
      const releasedDate = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000);

      const issue = createMockJiraIssue({
        fields: {
          ...createMockJiraIssue().fields,

          created: createdDate.toISOString()
        }
      });

      const changelog = createMockChangelog([
        { timestamp: createdDate, status: 'In Progress' },
        { timestamp: releasedDate, status: 'Release' },
        { timestamp: today, status: 'Closed' }
      ]);

      const result = processJiraIssue(SPECIAL_WORKFLOW, issue, changelog);
      expect(result.ageDays).toBe(0);
    });

    it('should calculate lead time correctly', () => {
      const createdDate = new Date('2024-01-01');
      const completedDate = new Date('2024-01-15');

      const issue = createMockJiraIssue({
        fields: {
          ...createMockJiraIssue().fields,
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

    it('should calculate cycle time correctly (development to done)', () => {
      const createdDate = new Date('2024-01-01');
      const inProgressDate = new Date('2024-01-03');
      const completedDate = new Date('2024-01-10');

      const issue = createMockJiraIssue({
        fields: {
          ...createMockJiraIssue().fields,
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

    it('should return 0 for cycle time if issue never went in development', () => {
      const issue = createMockJiraIssue();

      const changelog = createMockChangelog([
        { timestamp: new Date('2024-01-01T10:00:00'), status: 'Done' }
      ]);

      const result = processJiraIssue(TEST_WORKFLOW, issue, changelog);
      expect(result.cycleTimeDays).toBe(0);
    });

    it('should still return lead time properly when issue was closed but never went in dev', () => {
      const issue = createMockJiraIssue();

      const changelog = createMockChangelog([
        { timestamp: new Date('2024-01-05T10:00:00'), status: 'Done' }
      ]);

      const result = processJiraIssue(TEST_WORKFLOW, issue, changelog);
      expect(result.leadTimeDays).toBe(5);
    })

    it('should set done date if issue is closed', () => {
      const createdDate = new Date('2024-01-01');
      const inProgressDate = new Date('2024-01-03');
      const completedDate = new Date('2024-01-10');

      const issue = createMockJiraIssue({
        fields: {
          ...createMockJiraIssue().fields,
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

    it('should set current stage based on current status', () => {
      const issue = createMockJiraIssue({
        fields: {
          ...createMockJiraIssue().fields,
          status: {
            name: 'In Progress',
            id: '1',
            statusCategory: {
              id: 1,
              key: 'dev',
              name: 'In Progress',
              colorName: 'grey'
            }
          }
        }
      });

      const changelog = createMockChangelog([
        { timestamp: new Date('2024-01-01T10:00:00'), status: 'Backlog' },
        { timestamp: new Date('2024-01-02T10:00:00'), status: 'To Do', isSprint: true },
        { timestamp: new Date('2024-01-05T10:00:00'), status: "In Progress" },
        { timestamp: new Date('2024-01-05T10:00:00'), status: "To Do" },

      ]);

      const result = processJiraIssue(TEST_WORKFLOW, issue, changelog);
      expect(result.currentStage.key).toBe('dev');
    });

    it('should set added to sprint as current stage if that is the last stage in history', () => {
      const issue = createMockJiraIssue({
        fields: {
          ...createMockJiraIssue().fields,
          status: {
            name: 'To Do',
            id: '1',
            statusCategory: {
              id: 1,
              key: 'todo',
              name: 'To Do',
              colorName: 'grey'
            }
          }
        }
      });

      const changelog = createMockChangelog([
        { timestamp: new Date('2024-01-01T10:00:00'), status: 'Backlog' },
        { timestamp: new Date('2024-01-02T10:00:00'), status: 'To Do', isSprint: true },
      ]);

      const result = processJiraIssue(TEST_WORKFLOW, issue, changelog);
      expect(result.currentStage.isAddedToSprint).toBe(true);
    });

    it('should fallback currentStage from issue status when flow history is empty', () => {
      const issue = createMockJiraIssue({
        fields: {
          ...createMockJiraIssue().fields,
          status: {
            id: '10002',
            name: 'In Progress',
            statusCategory: {
              id: 2,
              key: 'development',
              colorName: 'blue',
              name: 'In Progress'
            }
          }
        }
      });

      const result = processJiraIssue(TEST_WORKFLOW, issue);
      expect(result.currentStage.key).toBe('dev');
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
