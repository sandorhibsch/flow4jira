import type { WorkflowDefinition, WorkflowStage } from './workflow-config';

export const WORKFLOW_STAGE_COLORS = [
  '#bab0ac',
  '#4e79a7',
  '#9c755f',
  '#f28e2b',
  '#edc948',
  '#76b7b2',
  '#5bcd28',
  '#59a14f',
] as const;

export interface WorkflowDraft {
  name: string;
  periodDays: number;
  stages: WorkflowStage[];
  boardType?: string;
}

export type RemoveStageResult =
  | { success: true; stages: WorkflowStage[] }
  | { success: false; error: string };

export function createInitialWorkflowStage(): WorkflowStage {
  return {
    key: 'backlog',
    name: 'Backlog',
    jiraStatuses: [],
    stageType: 'new',
    color: WORKFLOW_STAGE_COLORS[0],
  };
}

export function appendWorkflowStage(stages: WorkflowStage[]): WorkflowStage[] {
  const stageNumber = stages.length + 1;
  return [
    ...stages,
    {
      key: `stage${stageNumber}`,
      name: `Stage ${stageNumber}`,
      jiraStatuses: [],
      stageType: 'in-progress',
      color: WORKFLOW_STAGE_COLORS[stageNumber % WORKFLOW_STAGE_COLORS.length],
    },
  ];
}

export function removeWorkflowStage(stages: WorkflowStage[], index: number): RemoveStageResult {
  if (stages.length <= 1) {
    return { success: false, error: 'Must have at least one stage' };
  }
  if (!stages[index]) return { success: true, stages };
  return { success: true, stages: stages.filter((_, stageIndex) => stageIndex !== index) };
}

export function updateWorkflowStage(
  stages: WorkflowStage[],
  index: number,
  updates: Partial<WorkflowStage>
): WorkflowStage[] {
  if (!stages[index]) return stages;
  return stages.map((stage, stageIndex) => stageIndex === index ? { ...stage, ...updates } : stage);
}

export function assignStatusToStage(
  stages: WorkflowStage[],
  stageIndex: number,
  statusName: string
): WorkflowStage[] {
  const normalizedStatus = statusName.trim();
  const stage = stages[stageIndex];
  if (!stage || !normalizedStatus || stage.jiraStatuses.includes(normalizedStatus)) return stages;
  return updateWorkflowStage(stages, stageIndex, {
    jiraStatuses: [...stage.jiraStatuses, normalizedStatus],
  });
}

export function removeStatusFromStage(
  stages: WorkflowStage[],
  stageIndex: number,
  statusName: string
): WorkflowStage[] {
  const stage = stages[stageIndex];
  if (!stage || !stage.jiraStatuses.includes(statusName)) return stages;
  return updateWorkflowStage(stages, stageIndex, {
    jiraStatuses: stage.jiraStatuses.filter(status => status !== statusName),
  });
}

export function validateWorkflowDraft(draft: WorkflowDraft): string | null {
  if (!draft.name.trim()) return 'Workflow name is required';
  if (!Number.isFinite(draft.periodDays) || draft.periodDays <= 0) return 'Default period is required';
  if (draft.stages.length === 0) return 'At least one stage is required';

  const stagesWithoutStatuses = draft.stages.filter(stage => stage.jiraStatuses.length === 0);
  if (stagesWithoutStatuses.length > 0 && draft.boardType !== 'scrum') {
    return `Some stages have no statuses: ${stagesWithoutStatuses.map(stage => stage.name).join(', ')}`;
  }
  if (!draft.stages.some(stage => stage.isCycleStart)) {
    return 'At least one stage must be marked as cycle start';
  }
  if (!draft.stages.some(stage => stage.isCycleEnd)) {
    return 'At least one stage must be marked as cycle end';
  }
  return null;
}

export function buildWorkflowDefinition(
  boardId: string,
  name: string,
  stages: WorkflowStage[]
): WorkflowDefinition {
  return {
    key: `board-${boardId}`,
    name,
    stages: stages.map(stage => ({ ...stage, jiraStatuses: [...stage.jiraStatuses] })),
  };
}
