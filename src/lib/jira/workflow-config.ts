export type FlowStage = 'backlog' | 'analyze' | 'ready' | 'development' | 'deployment' | 'testing' | 'release' | 'done';

export const STATUS_MAPPING: Record<string, FlowStage> = {
  // Map Jira statuses to flow stages
  'New': 'backlog',
  'Inbox': 'backlog',
  'Backlog': 'backlog',
  'Analyze in Progress': 'analyze',
  'Specification': 'analyze',
  'Planned for Release': 'ready',
  'Specification Done': 'ready',
  'Work in Progress': 'development',
  'Implementation': 'development',
  'Completed': 'deployment',
  'Implementation Done': 'deployment',
  'Waiting for CITST': 'deployment',
  'To be Tested': 'testing',
  'CITST': 'testing',
  'To be Delivered': 'release',
  'Solution to be Approved': 'release',
  'Closed': 'done',
  'Development Closed': 'done',
  'Abandonded': 'done',
  'Done': 'done'
};

export function getFlowStage(jiraStatusName: string | undefined): FlowStage {
  if (!jiraStatusName) return 'backlog';
  return STATUS_MAPPING[jiraStatusName] ?? 'backlog';
}

export type WorkflowStage = {
  key: string;
  name: string;
  jiraStatuses: string[];
  isCycleStart?: boolean;
  isCycleEnd?: boolean;
  stageType: 'new' | 'ready' | 'in-progress' | 'done';
};

export type WorkflowDefinition = {
  key: string;
  name: string;
  stages: WorkflowStage[];
};

// Example: generic software dev flow
export const DEFAULT_WORKFLOW: WorkflowDefinition = {
  key: 'default',
  name: 'Full Development Workflow',
  stages: [
    { key: 'backlog', name: 'Backlog', jiraStatuses: ['New', 'Inbox', 'Backlog'], stageType: 'new' },
    { key: 'analyze', name: 'Analysis', jiraStatuses: ['Analyze in Progress', 'Specification'], isCycleStart: true, stageType: 'in-progress' },
    { key: 'ready', name: 'Ready', jiraStatuses: ['Planned for Release', 'Specification Done'], stageType: 'in-progress' },
    { key: 'dev', name: 'Development', jiraStatuses: ['Work in Progress', 'Implementation'], stageType: 'in-progress' },
    { key: 'deploy', name: 'Deployment', jiraStatuses: ['Completed', 'Implementation Done', 'Waiting for CITST'], stageType: 'in-progress' },
    { key: 'test', name: 'Testing', jiraStatuses: ['CITST', 'To be Tested'], stageType: 'in-progress' },
    { key: 'release', name: 'Release', jiraStatuses: ['To be Delivered', 'Solution to be Approved', 'CITST Done'], stageType: 'in-progress' },
    { key: 'done', name: 'Done', jiraStatuses: ['Closed', 'Development Closed', 'Abandoned', 'Done'], isCycleEnd: true, stageType: 'done' },
  ],
};

export function findStageByStatus(
  workflow: WorkflowDefinition,
  jiraStatus: string | undefined | null
): WorkflowStage {
  if (!jiraStatus) return workflow.stages[0];
  return workflow.stages.find(s => s.jiraStatuses.includes(jiraStatus)) ?? workflow.stages[0];
}

export function getBacklogStage(workflow: WorkflowDefinition): WorkflowStage | undefined {
  return workflow.stages.find(s => s.stageType === 'new') ?? undefined;
}

export function getReadyStage(workflow: WorkflowDefinition): WorkflowStage | undefined {
  return workflow.stages.find(s => s.stageType === 'ready') ?? undefined;
}

export function getWIPStages(workflow: WorkflowDefinition): WorkflowStage[] | undefined {
  return workflow.stages.filter(s => s.stageType === 'in-progress') ?? undefined;
}

export function getDoneStage(workflow: WorkflowDefinition): WorkflowStage | undefined {
  return workflow.stages.find(s => s.stageType === 'done') ?? undefined;
}