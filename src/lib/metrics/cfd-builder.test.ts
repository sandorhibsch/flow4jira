import { createMockProcessedIssue, createProcessedIssues, TEST_WORKFLOW } from "../testutils/create-mocks";
import { buildCumulativeFlowData } from "./cfd-builder";
import { addDays, setHours, setMinutes } from "date-fns";

describe('Cumulative flow data builder - single issues', () => {
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

describe('Cumulative flow data builder - multiple issues', () => {
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
    expect(firstDay.ready).toBe(1);
    expect(firstDay.dev).toBe(1);
    expect(firstDay.test).toBe(0);
    expect(firstDay.done).toBe(0);
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

describe("buildCumulativeFlowData - same day transitions", () => {
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