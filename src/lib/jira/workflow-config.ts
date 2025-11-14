export type WorkflowStage = {
  key: string;
  name: string;
  jiraStatuses: string[];
  isCycleStart?: boolean;
  isCycleEnd?: boolean;
  stageType: 'new' | 'ready' | 'in-progress' | 'done';
  color?: string;
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
    { key: 'backlog', name: 'Backlog', jiraStatuses: ['New', 'Inbox', 'Backlog'], stageType: 'new', color: "#4e79a7" },
    { key: 'analyze', name: 'Analysis', jiraStatuses: ['Analyze in Progress', 'Specification'], isCycleStart: true, stageType: 'in-progress', color: "#bab0ac" },
    { key: 'ready', name: 'Ready', jiraStatuses: ['Planned for Release', 'Specification Done'], stageType: 'in-progress', color: "#9c755f" },
    { key: 'dev', name: 'Development', jiraStatuses: ['Work in Progress', 'Implementation'], stageType: 'in-progress', color: "#f28e2b" },
    { key: 'deploy', name: 'Deployment', jiraStatuses: ['Completed', 'Implementation Done', 'Waiting for CITST'], stageType: 'in-progress', color: "#edc948" },
    { key: 'test', name: 'Testing', jiraStatuses: ['CITST', 'To be Tested'], stageType: 'in-progress', color: "#76b7b2" },
    { key: 'release', name: 'Release', jiraStatuses: ['To be Delivered', 'Solution to be Approved', 'CITST Done'], stageType: 'in-progress', color: "#e15759" },
    { key: 'done', name: 'Done', jiraStatuses: ['Closed', 'Development Closed', 'Abandoned', 'Done'], isCycleEnd: true, stageType: 'done', color: "#59a14f" },
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