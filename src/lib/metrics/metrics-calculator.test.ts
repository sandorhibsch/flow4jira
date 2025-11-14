import { TEST_WORKFLOW, createMockProcessedIssue, createProcessedIssues } from "../testutils/create-mocks";
import { calculateSummary } from "./metrics-calculator";


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
      currentStage: TEST_WORKFLOW.stages[6],
    })

    const result = calculateSummary([issueInProgress, issueInTesting, issueDone]);

    expect(result.averageAge).toBe(7);
  });

  it('should include not-development issues in average age calculation', () => {
    const issueOpen = createMockProcessedIssue({
      ...createMockProcessedIssue(),
      currentStage: TEST_WORKFLOW.stages[0],
      ageDays: 4
    });

    const issueInProgress = createMockProcessedIssue({
      ...createMockProcessedIssue(),
      currentStage: TEST_WORKFLOW.stages[2],
      ageDays: 6
    });

    const issueInTesting = createMockProcessedIssue({
      ...createMockProcessedIssue(),
      currentStage: TEST_WORKFLOW.stages[4],
      ageDays: 8
    });

    const issueDone = createMockProcessedIssue({
      ...createMockProcessedIssue(),
      currentStage: TEST_WORKFLOW.stages[6],
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