// buildSequentialFlow.ts
import { WorkflowDefinition, WorkflowStage, findStageByStatus, getBacklogStage } from '../jira/workflow-config';
import { StatusChange } from './history-builder';

export type SequentialStageEntry = {
  stage: WorkflowStage;
  enteredAt: Date;
  jiraStatus: string;
};

export function buildSequentialFlow(
  workflow: WorkflowDefinition,
  issueCreatedDate: Date,
  issueStatusChanges: StatusChange[]
): SequentialStageEntry[] {
  issueStatusChanges.sort((a, b) => a.enteredAt.getTime() - b.enteredAt.getTime());

  const allTransitions: SequentialStageEntry[] = [];

  const initialStage = getBacklogStage(workflow) || workflow.stages[0];

  allTransitions.push({
    stage: initialStage,
    jiraStatus: initialStage.jiraStatuses[0],
    enteredAt: issueCreatedDate,
  });

  const seenStages = new Set<WorkflowStage>();
  seenStages.add(initialStage);

  for (const event of issueStatusChanges) {
    const toStage = calculateStageFromStatusChangeEvent(event, workflow);

    // If stage not recorded yet, add it
    if (!seenStages.has(toStage)) {
      allTransitions.push({
        stage: toStage,
        jiraStatus: event.to,
        enteredAt: event.enteredAt
      });
      seenStages.add(toStage);
    }
  }

  // Now normalize to workflow order: remove duplicates, keep first time entered
  const seenStageKeys = new Set<string>();
  const orderedStages = workflow.stages.map(s => s.key);

  const sequential = allTransitions
    .filter(transition => {
      if (seenStageKeys.has(transition.stage.key)) return false;
      seenStageKeys.add(transition.stage.key);
      return true;
    })
    .sort((a, b) => {
      // sort by defined workflow order, not timestamp
      const aIdx = orderedStages.indexOf(a.stage.key);
      const bIdx = orderedStages.indexOf(b.stage.key);
      return aIdx - bIdx;
    });

  return sequential;
}

function calculateStageFromStatusChangeEvent(event: StatusChange, workflow: WorkflowDefinition): WorkflowStage {
  const calculatedStage = event.isAddedToSprint ?
    workflow.stages.find(s => s.stageType === 'ready') :
    findStageByStatus(workflow, event.to);

  return calculatedStage ?? workflow.stages[0];
}

