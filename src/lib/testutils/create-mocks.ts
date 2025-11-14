import { ProcessedFlowIssue } from "../flow/flow-types";
import { WorkflowDefinition } from "../jira/workflow-config";

export const TEST_WORKFLOW: WorkflowDefinition = {
  key: 'default',
  name: 'Full Development Workflow',
  stages: [
    { key: 'backlog', name: 'Backlog', jiraStatuses: ['New', 'Backlog'], stageType: 'new' },
    { key: 'ready', name: 'Ready', jiraStatuses: ['To Do'], stageType: 'ready' },
    { key: 'dev', name: 'Development', jiraStatuses: ['In Progress'], stageType: 'in-progress', isCycleStart: true },
    { key: 'deploy', name: 'Deployment', jiraStatuses: ['Deployed'], stageType: 'in-progress' },
    { key: 'test', name: 'Testing', jiraStatuses: ['Test'], stageType: 'in-progress' },
    { key: 'release', name: 'Release', jiraStatuses: ['To be Released'], stageType: 'in-progress' },
    { key: 'done', name: 'Done', jiraStatuses: ['Done'], stageType: 'done', isCycleEnd: true },
  ],
};

/**
 * Test helper: Create mock processed issue
 */
export function createMockProcessedIssue(overrides: Partial<ProcessedFlowIssue> = {}): ProcessedFlowIssue {
  const baseIssue: ProcessedFlowIssue = {
    key: "PROJ-123",
    summary: "Take out the garbage",
    issueType: "Story",
    created: new Date('2024-01-01'),
    flowHistory: [],
    currentStage: TEST_WORKFLOW.stages[0],
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
export function createProcessedIssues(): ProcessedFlowIssue[] {
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

  const issueDone1 = createMockProcessedIssue({
    ...createMockProcessedIssue(),
    currentStage: TEST_WORKFLOW.stages[6],
    cycleTimeDays: 6,
    leadTimeDays: 8,
    ageDays: 0
  })

  const issueDone2 = createMockProcessedIssue({
    ...createMockProcessedIssue(),
    currentStage: TEST_WORKFLOW.stages[6],
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