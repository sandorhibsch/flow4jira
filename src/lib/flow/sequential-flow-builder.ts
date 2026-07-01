// buildSequentialFlow.ts
import { se } from 'date-fns/locale';
import type { WorkflowDefinition, WorkflowStage } from '../jira/workflow-config';
import { findStageByStatus, getBacklogStage } from '../jira/workflow-config';
import type { StatusChange } from './history-builder';

export type SequentialStageEntry = {
  stage: WorkflowStage;
  enteredAt: Date;
  jiraStatus: string;
  isActualCycleStart?: boolean;
};

export function buildSequentialFlow(
  workflow: WorkflowDefinition,
  issueCreatedDate: Date,
  issueStatusChanges: StatusChange[]
): SequentialStageEntry[] {
  const allTransitions: SequentialStageEntry[] = [];

  const initialStage = getInitialStage(workflow);
  const firstStageEntry = createFirstStageEntry(initialStage, issueCreatedDate);

  allTransitions.push(firstStageEntry);

  const seenStages = new Set<WorkflowStage>();
  seenStages.add(firstStageEntry.stage);

  issueStatusChanges.sort((a, b) => a.enteredAt.getTime() - b.enteredAt.getTime());
  for (const event of issueStatusChanges) {
    const toStage = calculateStageFromStatusChangeEvent(event, workflow);

    // If stage not recorded yet, add it
    if (!seenStages.has(toStage)) {
      allTransitions.push({
        stage: toStage,
        jiraStatus: event.to,
        enteredAt: event.enteredAt,
        isActualCycleStart: toStage?.isCycleStart
      });
      seenStages.add(toStage);
    }
  }

  const sequentialFlow = orderTransitions(allTransitions, workflow);

  if (sequentialFlow.find(s => s.stage.stageType == 'in-progress') && !sequentialFlow.find(t => t.isActualCycleStart)) {
    const actualStartStage = findActualCycleStart(sequentialFlow, workflow);
    if (actualStartStage) {
      actualStartStage.isActualCycleStart = true;
    }
  }

  return sequentialFlow;
}

function getInitialStage(workflow: WorkflowDefinition): WorkflowStage {
  const initialStage = getBacklogStage(workflow);
  if (!initialStage) {
    throw new Error('Workflow must have at least a backlog stage');
  }

  return initialStage;
}

function createFirstStageEntry(initialStage: WorkflowStage, created: Date): SequentialStageEntry {


  const initialStatus = initialStage.jiraStatuses[0] ?? 'Unknown';

  return {
    stage: initialStage,
    jiraStatus: initialStatus,
    enteredAt: created
  }

}

function calculateStageFromStatusChangeEvent(event: StatusChange, workflow: WorkflowDefinition): WorkflowStage {
  const calculatedStage = event.isAddedToSprint ?
    workflow.stages.find(s => s.isAddedToSprint) :
    findStageByStatus(workflow, event.to);

  if (!calculatedStage) {
    return getInitialStage(workflow);
  }

  return calculatedStage!;
}

function orderTransitions(transitions: SequentialStageEntry[], workflow: WorkflowDefinition) {
  const orderedStages = workflow.stages.map(s => s.key);

  return transitions
    .sort((a, b) => {
      // sort by defined workflow order, not timestamp
      const aIdx = orderedStages.indexOf(a.stage.key);
      const bIdx = orderedStages.indexOf(b.stage.key);
      return aIdx - bIdx;
    });
}

function findActualCycleStart(sequentialFlow: SequentialStageEntry[], workflow: WorkflowDefinition): SequentialStageEntry | undefined {
  let actualStart: SequentialStageEntry | undefined;
  let startIdx = workflow.stages.findIndex(s => s.isCycleStart);
  while (startIdx >= 0) {
    actualStart = sequentialFlow.find(s => s.stage.key == workflow.stages[startIdx]?.key);
    if (actualStart) break;
    startIdx--;
  }

  return actualStart;
}

