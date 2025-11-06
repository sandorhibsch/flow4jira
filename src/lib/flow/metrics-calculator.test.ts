import { ProcessedFlowIssue } from "./flow-types";
import { calculateSummary } from "./metrics-calculator";

/**
 * Test helper: Create mock processed issue
 */
function createMockProcessedIssue(overrides: Partial<ProcessedFlowIssue> = {}): ProcessedFlowIssue {
  const baseIssue: ProcessedFlowIssue = {
    key: "PROJ-123",
    summary: "Take out the garbage",
    issueType: "Story",
    created: new Date('2024-01-01'),
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