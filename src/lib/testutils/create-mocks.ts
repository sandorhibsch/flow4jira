import { NextRequest } from "next/server";
import type { ProcessedFlowIssue } from "../flow/flow-types";
import type { WorkflowDefinition } from "../jira/workflow-config";

export function createMockRequest(
  baseUrl: string,
  searchParams: Record<string, string> = {},
  body?: object
): NextRequest {
  const url = new URL(baseUrl);
  Object.entries(searchParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const request = new NextRequest(url, {
    method: body ? 'POST' : 'GET',
  });

  // Mock json() for POST requests
  if (body) {
    jest.spyOn(request, 'json').mockResolvedValue(body);
  }

  return request;
}

export const mockJiraIssue = {
  key: 'PROJ-1',
  id: '1',
  self: 'http://jira/issue/1',
  fields: {
    summary: 'Test issue',
    created: new Date('2024-01-01').toISOString(),
    resolutiondate: null,
    issuetype: { id: '1', name: 'Story', iconUrl: '' },
    status: {
      id: '1',
      name: 'In Progress',
      statusCategory: { id: 2, key: 'indeterminate', colorName: 'yellow', name: 'In Progress' }
    }
  },
  changelog: {
    self: '',
    maxResults: 0,
    startAt: 0,
    total: 0,
    isLast: true,
    histories: []
  }
}

export const TEST_WORKFLOW: WorkflowDefinition = {
  key: 'default',
  name: 'Full Development Workflow',
  stages: [
    { key: 'backlog', name: 'Backlog', jiraStatuses: ['New', 'Backlog'], stageType: 'new' },
    { key: 'ready', name: 'Ready', jiraStatuses: ['To Do'], isAddedToSprint: true, stageType: 'ready' },
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
  const firstStage = TEST_WORKFLOW.stages[0];
  if (!firstStage) {
    throw new Error('TEST_WORKFLOW must have at least one stage');
  }
  
  const baseIssue: ProcessedFlowIssue = {
    key: "PROJ-123",
    summary: "Take out the garbage",
    issueType: "Story",
    created: new Date('2024-01-01'),
    flowHistory: [],
    currentStage: firstStage,
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