import { ProcessedFlowIssue } from "../flow/flow-types";
import { createMockProcessedIssue, createProcessedIssues, TEST_WORKFLOW } from "../testutils/create-mocks";
import { buildCumulativeFlowData, calculateAverageAge, calculateAverageCT, calculateAverageThroughput, calculateAverageWIP } from "./cfd-builder";
import { addDays, setHours, setMinutes } from "date-fns";

describe('CFD builder - single issues', () => {
  const now = new Date();

  it('returns dates from set days ago to today', () => {
    const issues = createProcessedIssues();

    const result = buildCumulativeFlowData(issues, TEST_WORKFLOW, 30);

    expect(result.length).toBe(31);
  });

  it("should track a single issue transitioning from todo to dev three days ago", () => {
    const threeDaysAgo = addDays(now, -3);

    const issue = createMockProcessedIssue({
      ...createMockProcessedIssue(),
      flowHistory: [
        {
          stage: TEST_WORKFLOW.stages[1]!, // ready
          enteredAt: addDays(now, -10),
          jiraStatus: "To Do",
        },
        {
          stage: TEST_WORKFLOW.stages[2]!, // dev
          enteredAt: threeDaysAgo,
          jiraStatus: "In Progress",
        },
      ]
    });

    const result = buildCumulativeFlowData([issue], TEST_WORKFLOW, 10);

    // Before transition: todo = 1, dev = 0
    const dayBeforeTransition = result.find(
      (r) => r.date.toDateString() === addDays(threeDaysAgo, -1).toDateString()
    );
    expect(dayBeforeTransition?.ready).toBe(1);
    expect(dayBeforeTransition?.dev).toBe(0);

    // After transition: todo = 0, dev = 1
    const dayAfterTransition = result.find(
      (r) => r.date.toDateString() === addDays(threeDaysAgo, 1).toDateString()
    );
    expect(dayAfterTransition?.ready).toBe(0);
    expect(dayAfterTransition?.dev).toBe(1);

    // Sanity: all others 0
    result.forEach((r) => {
      expect(r.done).toBe(0);
    });
  });

  it("should not count issues that were already done before the reporting period", () => {
    const doneBeforeStart = addDays(now, -20);
    const periodDays = 10;

    const issue = createMockProcessedIssue({
      ...createMockProcessedIssue(),
      flowHistory: [
        {
          stage: TEST_WORKFLOW.stages[1]!, // dev
          enteredAt: addDays(now, -25),
          jiraStatus: "To Do",
        },
        {
          stage: TEST_WORKFLOW.stages[6]!, // done
          enteredAt: doneBeforeStart,
          jiraStatus: "Done",
        },
      ]
    });

    const result = buildCumulativeFlowData([issue], TEST_WORKFLOW, periodDays);

    // Expect done = 0 on first day and throughout the period
    result.forEach((r) => {
      expect(r.done).toBe(0);
    });
  });

  it("should count issues that were done after the reporting period", () => {
    const threeDaysAgo = addDays(now, -3);
    const periodDays = 10;

    const issue = createMockProcessedIssue({
      ...createMockProcessedIssue(),
      flowHistory: [
        {
          stage: TEST_WORKFLOW.stages[2]!, // dev
          enteredAt: addDays(now, -25),
          jiraStatus: "Dev",
        },
        {
          stage: TEST_WORKFLOW.stages[6]!, // done
          enteredAt: threeDaysAgo,
          jiraStatus: "Done",
        },
      ]
    });

    const result = buildCumulativeFlowData([issue], TEST_WORKFLOW, periodDays);

    // Before transition: todo = 1, done = 0
    const dayBeforeTransition = result.find(
      (r) => r.date.toDateString() === addDays(threeDaysAgo, -1).toDateString()
    );
    expect(dayBeforeTransition?.dev).toBe(1);
    expect(dayBeforeTransition?.done).toBe(0);

    // After transition: todo = 0, dev = 1
    const dayAfterTransition = result.find(
      (r) => r.date.toDateString() === addDays(threeDaysAgo, 1).toDateString()
    );
    expect(dayAfterTransition?.dev).toBe(0);
    expect(dayAfterTransition?.done).toBe(1);
  });

  it("should count an issue in dev until it reaches the next stage even if skipping", () => {
    const threeDaysAgo = addDays(now, -3);

    const issue = createMockProcessedIssue({
      ...createMockProcessedIssue(),
      flowHistory: [
        {
          stage: TEST_WORKFLOW.stages[2]!, // dev
          enteredAt: addDays(now, -10),
          jiraStatus: "In Progress",
        },
        {
          stage: TEST_WORKFLOW.stages[4]!, // test
          enteredAt: threeDaysAgo,
          jiraStatus: "Test",
        },
      ]
    });

    const result = buildCumulativeFlowData([issue], TEST_WORKFLOW, 10);

    // Before transition: dev = 1, deploy = 0, test = 0
    const dayBeforeTransition = result.find(
      (r) => r.date.toDateString() === addDays(threeDaysAgo, -1).toDateString()
    );
    expect(dayBeforeTransition?.dev).toBe(1);
    expect(dayBeforeTransition?.deploy).toBe(0);
    expect(dayBeforeTransition?.test).toBe(0);

    // After transition: dev = 0, deploy = 0, test = 1
    const dayAfterTransition = result.find(
      (r) => r.date.toDateString() === addDays(threeDaysAgo, 1).toDateString()
    );
    expect(dayAfterTransition?.dev).toBe(0);
    expect(dayBeforeTransition?.deploy).toBe(0);
    expect(dayAfterTransition?.test).toBe(1);

    // Be


  });

  it("should count an issue in dev if it's still there at the end of the period", () => {
    const threeDaysAgo = addDays(now, -3);

    const issue = createMockProcessedIssue({
      ...createMockProcessedIssue(),
      flowHistory: [
        {
          stage: TEST_WORKFLOW.stages[2]!, // dev
          enteredAt: addDays(now, -10),
          jiraStatus: "In Progress",
        }
      ]
    });

    const result = buildCumulativeFlowData([issue], TEST_WORKFLOW, 10);

    // Before transition: dev = 1, deploy = 0, test = 0
    const dayBeforeTransition = result.find(
      (r) => r.date.toDateString() === addDays(threeDaysAgo, -1).toDateString()
    );
    expect(dayBeforeTransition?.dev).toBe(1);
    expect(dayBeforeTransition?.deploy).toBe(0);
    expect(dayBeforeTransition?.test).toBe(0);


    // After transition: dev = 0, deploy = 0, test = 1
    const lastDay = result.find(
      (r) => r.date.toDateString() === now.toDateString()
    );
    expect(lastDay?.dev).toBe(1);
    expect(lastDay?.release).toBe(0);
    expect(lastDay?.done).toBe(0);

    // Be


  });

  it("should not count issues in backlog", () => {
    const periodDays = 10;

    const issue = createMockProcessedIssue({
      ...createMockProcessedIssue(),
      flowHistory: [
        {
          stage: TEST_WORKFLOW.stages[0]!, // new
          enteredAt: addDays(now, -25),
          jiraStatus: "Backlog",
        },

      ]
    });

    const result = buildCumulativeFlowData([issue], TEST_WORKFLOW, periodDays);

    // Expect done = 0 on first day and throughout the period
    result.forEach((r) => {
      expect(r.backlog).toBe(undefined);
    });
  });


});

describe('CFD builder - multiple issues', () => {
  const now = new Date();

  it("counts multiple issues across different stages on the same day", () => {
    const periodDays = 7;

    const issueA = createMockProcessedIssue({
      ...createMockProcessedIssue(),
      flowHistory: [
        {
          stage: TEST_WORKFLOW.stages[1]!, // ready
          enteredAt: addDays(now, -10),
          jiraStatus: "To Do",
        },
      ]
    });

    const issueB = createMockProcessedIssue({
      ...createMockProcessedIssue(),
      flowHistory: [
        {
          stage: TEST_WORKFLOW.stages[2]!, // dev
          enteredAt: addDays(now, -10),
          jiraStatus: "In Progress",
        },
      ]
    });

    const result = buildCumulativeFlowData([issueA, issueB], TEST_WORKFLOW, periodDays);

    const firstDay = result[0];
    expect(firstDay).toBeDefined();
    expect(firstDay?.ready).toBe(1);
    expect(firstDay?.dev).toBe(1);
    expect(firstDay?.test).toBe(0);
    expect(firstDay?.done).toBe(0);
  });

  it("tracks transitions for multiple issues over time", () => {
    const periodDays = 7;

    const issueA = createMockProcessedIssue({
      ...createMockProcessedIssue(),
      flowHistory: [
        {
          stage: TEST_WORKFLOW.stages[1]!, // ready
          enteredAt: addDays(now, -10),
          jiraStatus: "To Do",
        },
        {
          stage: TEST_WORKFLOW.stages[2]!, // dev
          enteredAt: addDays(now, -3),
          jiraStatus: "In Progress",
        },
      ]
    });

    const issueB = createMockProcessedIssue({
      ...createMockProcessedIssue(),
      flowHistory: [
        {
          stage: TEST_WORKFLOW.stages[1]!, // ready
          enteredAt: addDays(now, -8),
          jiraStatus: "To Do",
        },
        {
          stage: TEST_WORKFLOW.stages[6]!, // done
          enteredAt: addDays(now, -1),
          jiraStatus: "Done",
        },
      ]
    });

    const result = buildCumulativeFlowData([issueA, issueB], TEST_WORKFLOW, periodDays);

    // Before transitions
    const earlyDay = result.find(
      (r) => r.date.toDateString() === addDays(now, -6).toDateString()
    );

    expect(earlyDay?.ready).toBe(2);
    expect(earlyDay?.dev).toBe(0);
    expect(earlyDay?.done).toBe(0);

    // After issueA enters dev
    const afterADev = result.find(
      (r) => r.date.toDateString() === addDays(now, -2).toDateString()
    );

    expect(afterADev?.ready).toBe(1);
    expect(afterADev?.dev).toBe(1);
    expect(afterADev?.done).toBe(0);

    // After issueB is done
    const afterBDone = result.find(
      (r) => r.date.toDateString() === addDays(now, 0).toDateString()
    );

    expect(afterBDone?.ready).toBe(0);
    expect(afterBDone?.dev).toBe(1);
    expect(afterBDone?.done).toBe(1);
  });
});

describe("CFD builder - same day transitions", () => {
  const now = new Date();

  it("handles multiple transitions happening on the same day", () => {
    const periodDays = 5;

    const dayMinus3 = addDays(now, -3);

    // Issue A does TWO transitions on the same day
    const issueA = createMockProcessedIssue({
      ...createMockProcessedIssue(),
      flowHistory: [
        {
          stage: TEST_WORKFLOW.stages[1]!, // ready
          enteredAt: addDays(now, -10),
          jiraStatus: "To Do",
        },
        {
          stage: TEST_WORKFLOW.stages[2]!, // dev
          enteredAt: setMinutes(setHours(dayMinus3, 9), 0),
          jiraStatus: "In Progress",
        },
        {
          stage: TEST_WORKFLOW.stages[4]!, // test
          enteredAt: setMinutes(setHours(dayMinus3, 15), 30),
          jiraStatus: "Test",
        },
      ],
    });

    // Issue B does ONE transition on the same day
    const issueB = createMockProcessedIssue({
      ...createMockProcessedIssue(),
      flowHistory: [
        {
          stage: TEST_WORKFLOW.stages[1]!, // ready
          enteredAt: addDays(now, -5),
          jiraStatus: "To Do",
        },
        {
          stage: TEST_WORKFLOW.stages[2]!, // dev
          enteredAt: setMinutes(setHours(dayMinus3, 11), 45),
          jiraStatus: "In Progress",
        },
      ],
    });

    const result = buildCumulativeFlowData([issueA, issueB], TEST_WORKFLOW, periodDays);

    const dayMinus3Record = result.find(
      (r) => r.date.toDateString() === addDays(now, -2).toDateString()
    );
    const dayMinus2Record = result.find(
      (r) => r.date.toDateString() === addDays(now, -1).toDateString()
    );

    // On the transition day:
    // Issue A: transitions twice. For THAT day, we should count test (the final stage that day).
    // Issue B: transitions once into dev.
    //
    // So:
    // ready: 0
    // dev: 1 (issue B)
    // test: 1 (issue A)
    // done: 0

    expect(dayMinus3Record?.ready).toBe(0);
    expect(dayMinus3Record?.dev).toBe(1);
    expect(dayMinus3Record?.test).toBe(1);
    expect(dayMinus3Record?.done).toBe(0);

    // Next day:
    // Issue A remains in test.
    // Issue B remains in dev.

    expect(dayMinus2Record?.ready).toBe(0);
    expect(dayMinus2Record?.dev).toBe(1);
    expect(dayMinus2Record?.test).toBe(1);
    expect(dayMinus2Record?.done).toBe(0);
  });

});

describe('CFD builder - average throughput', () => {

  it('should return 0 for throughput if no issues', () => {
    const issues: ProcessedFlowIssue[] = [];

    const result = calculateAverageThroughput(issues, 30);

    expect(result).toBe(0);
  });

  it('should return 0 for throughput if period is 0', () => {
    const issues = createProcessedIssues();

    const result = calculateAverageThroughput(issues, 0);

    expect(result).toBe(0);
  });

  it('should calculate average for 2 issues done in 2 days correctly', () => {
    const now = new Date();
    const issueDone1 = createMockProcessedIssue({
      done: new Date(now.getTime() - 1000)
    });
    const issueDone2 = createMockProcessedIssue({
      done: new Date(now.getTime() - 36 * 60 * 60 * 1000)
    });
    const issueDone3 = createMockProcessedIssue({
      done: new Date(now.getTime() - 40 * 60 * 60 * 1000)
    });
    const issueDone4 = createMockProcessedIssue({
      done: new Date(now.getTime() - 44 * 60 * 60 * 1000)
    });

    const result = calculateAverageThroughput([issueDone1, issueDone2, issueDone3, issueDone4], 2);

    expect(result).toBe(2);
  });

  it('should not take issues done before period in account', () => {
    const now = new Date();
    const issueDone1 = createMockProcessedIssue({
      done: new Date(now.getTime() - 1000)
    })
    const issueDone2 = createMockProcessedIssue({
      done: new Date(now.getTime() - 2000)
    })
    const issueDone3 = createMockProcessedIssue({
      done: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
    })

    const result = calculateAverageThroughput([issueDone1, issueDone2, issueDone3], 1);

    expect(result).toBe(2);
  })

  it('should not count open issues', () => {
    const now = new Date();
    const issueDone = createMockProcessedIssue({
      done: new Date(now.getTime() - 1000)
    });
    const issueNew = createMockProcessedIssue({
      done: undefined,
      currentStage: {
        stageType: 'new',
        name: 'new',
        key: 'new',
        jiraStatuses: []
      }
    });
    const issueReady = createMockProcessedIssue({
      done: undefined,
      currentStage: {
        stageType: 'ready',
        name: 'ready',
        key: 'ready',
        jiraStatuses: []
      }
    });
    const issueDev = createMockProcessedIssue({
      done: undefined,
      currentStage: {
        stageType: 'in-progress',
        name: 'dev',
        key: 'dev',
        jiraStatuses: []
      }
    });

    const result = calculateAverageThroughput([issueNew, issueReady, issueDev, issueDone], 1);

    expect(result).toBe(1);
  });

});

describe('CFD builder - average cycletime', () => {

  it('should return 0 for cycletime if no issues', () => {
    const issues: ProcessedFlowIssue[] = [];

    const result = calculateAverageCT(issues, 30);

    expect(result).toBe(0);
  });

  it('should return 0 for cycletime if period is 0', () => {
    const issues = createProcessedIssues();

    const result = calculateAverageCT(issues, 0);

    expect(result).toBe(0);
  });

  it('should calculate average for issues done in period correctly', () => {
    const now = new Date();
    const issueDone1 = createMockProcessedIssue({
      done: new Date(now.getTime() - 1000),
      cycleTimeDays: 2
    });
    const issueDone2 = createMockProcessedIssue({
      done: new Date(now.getTime() - 2000),
      cycleTimeDays: 4
    });

    const result = calculateAverageCT([issueDone1, issueDone2], 1);

    expect(result).toBe(3);
  });

  it('should not include issue done before period', () => {
    const now = new Date();
    const issueDone1 = createMockProcessedIssue({
      done: new Date(now.getTime() - 1000),
      cycleTimeDays: 2
    });
    const issueDone2 = createMockProcessedIssue({
      done: new Date(now.getTime() - 2000),
      cycleTimeDays: 4
    });
    const issueDone3 = createMockProcessedIssue({
      done: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      cycleTimeDays: 4
    });

    const result = calculateAverageCT([issueDone1, issueDone2, issueDone3], 1);

    expect(result).toBe(3);
  });

  it('should not include issue not done', () => {
    const now = new Date();
    const issueDone1 = createMockProcessedIssue({
      done: new Date(now.getTime() - 1000),
      cycleTimeDays: 2
    });
    const issueDone2 = createMockProcessedIssue({
      done: new Date(now.getTime() - 2000),
      cycleTimeDays: 4
    });
    const issueDev = createMockProcessedIssue({
      done: undefined,
      cycleTimeDays: undefined
    });

    const result = calculateAverageCT([issueDone1, issueDone2, issueDev], 1);

    expect(result).toBe(3);
  });
});

describe('CFD builder - average WIP', () => {

  it('should return 0 for WIP for no data', () => {
    const data: Record<string, any>[] = [];
    const stages = TEST_WORKFLOW.stages;

    const result = calculateAverageWIP(data, stages);

    expect(result).toBe(0);
  });

  it('should calculate average WIP correctly', () => {
    const today = new Date;
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const data: Record<string, any>[] = [
      {
        date: today,
        backlog: 0,
        ready: 0,
        dev: 1,
        deploy: 2,
        test: 3,
        release: 2,
        done: 0
      },
      {
        date: yesterday,
        backlog: 0,
        ready: 0,
        dev: 2,
        deploy: 3,
        test: 2,
        release: 1,
        done: 0
      },
    ];

    const result = calculateAverageWIP(data, TEST_WORKFLOW.stages);

    expect(result).toBe(8);
  })

  it('should not take new, ready and done into account', () => {
    const today = new Date;
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const data: Record<string, any>[] = [
      {
        date: today,
        backlog: 2,
        ready: 2,
        dev: 0,
        deploy: 0,
        test: 0,
        release: 0,
        done: 0
      },
      {
        date: yesterday,
        backlog: 2,
        ready: 3,
        dev: 0,
        deploy: 0,
        test: 0,
        release: 0,
        done: 1
      },
    ];

    const result = calculateAverageWIP(data, TEST_WORKFLOW.stages);

    expect(result).toBe(0);
  });
});

describe('CFG builder - average age', () => {
  it('should return 0 age for no data', () => {
    const issues: ProcessedFlowIssue[] = [];

    const result = calculateAverageAge(issues, 1);

    expect(result).toBe(0);
  });

  it('should return 0 age if no aging issues', () => {
    const today = Date.now();
    const issueDone = createMockProcessedIssue({
      done: new Date(today - (2 * 24 * 60 * 60 * 1000)),
      created: new Date(today - (3 * 24 * 60 * 60 * 1000))
    });
    const issueDone2 = createMockProcessedIssue({
      done: new Date(today - (3 * 24 * 60 * 60 * 1000)),
      created: new Date(today - (6 * 24 * 60 * 60 * 1000))
    });

    const result = calculateAverageAge([issueDone, issueDone2], 1);

    expect(result).toBe(0);
  });

  it('should calculate age for period correctly', () => {
    const today = Date.now();
    const issue1 = createMockProcessedIssue({
      done: undefined,
      created: new Date(today - (2 * 24 * 60 * 60 * 1000))
    });
    const issue2 = createMockProcessedIssue({
      done: undefined,
      created: new Date(today - (4 * 24 * 60 * 60 * 1000))
    });

    const result = calculateAverageAge([issue1, issue2], 1);

    expect(result).toBe(3);
  });

  it('should include issues done within period in age calculation', () => {
    const today = Date.now();
    const issueOpen = createMockProcessedIssue({
      done: undefined,
      created: new Date(today - (2 * 24 * 60 * 60 * 1000))
    });
    const issueDone = createMockProcessedIssue({
      done: new Date(today - (24 * 60 * 60 * 1000)),
      created: new Date(today - (4 * 24 * 60 * 60 * 1000))
    });

    const result = calculateAverageAge([issueOpen, issueDone], 2);

    expect(result).toBe(3);
  });

  it('should exclude issues done before period in age calculation', () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-01-10T00:00:00.000Z'));
    const today = Date.now();
    const issueOpen = createMockProcessedIssue({
      done: undefined,
      created: new Date(today - (2 * 24 * 60 * 60 * 1000))
    });
    const issueDone = createMockProcessedIssue({
      done: new Date(today - (3 * 24 * 60 * 60 * 1000)),
      created: new Date(today - (4 * 24 * 60 * 60 * 1000))
    });

    const result = calculateAverageAge([issueOpen, issueDone], 2);

    expect(result).toBe(2);
    jest.useRealTimers();
  });

});
