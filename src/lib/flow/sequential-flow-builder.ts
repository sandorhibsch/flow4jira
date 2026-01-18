// buildSequentialFlow.ts
import type { WorkflowDefinition, WorkflowStage} from '../jira/workflow-config';
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
  issueStatusChanges.sort((a, b) => a.enteredAt.getTime() - b.enteredAt.getTime());

  const allTransitions: SequentialStageEntry[] = [];

  const backlogStage = getBacklogStage(workflow);
  const firstStage = workflow.stages[0];
  const initialStage = backlogStage ?? firstStage;
  
  if (!initialStage) {
    throw new Error('Workflow must have at least one stage');
  }

  const initialStatus = initialStage.jiraStatuses[0] ?? 'Unknown';

  allTransitions.push({
    stage: initialStage,
    jiraStatus: initialStatus,
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
        enteredAt: event.enteredAt,
        isActualCycleStart: toStage.isCycleStart
      });
      seenStages.add(toStage);
    }
  }

  // Now normalize to workflow order: remove duplicates, keep first time entered
  const seenStageKeys = new Set<string>();
  const orderedStages = workflow.stages.map(s => s.key);

  const sequentialFlow = allTransitions
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

  //find stageentry where item entered the cycle
  // --- NEW LOGIC: detect and mark the actual cycle start ---
  const definedStartIdx = workflow.stages.findIndex(s => s.isCycleStart);
  if (definedStartIdx >= 0) {
    // Find the actual stage to start from
    let actualStart: SequentialStageEntry | undefined = sequentialFlow.find(
      e => e.stage.isCycleStart
    );

    // If missing, look backward in the workflow
    if (!actualStart) {
      for (let i = definedStartIdx - 1; i >= 0; i--) {
        const prevStage = workflow.stages[i];
        if (!prevStage) continue;
        const prevKey = prevStage.key;
        const candidate = sequentialFlow.find(e => e.stage.key === prevKey);
        if (candidate) {
          actualStart = candidate;
          break;
        }
      }
    }

    // If still missing, fall back to the first recorded stage
    if (!actualStart && sequentialFlow.length > 0) {
      const first = sequentialFlow[0];
      if (first) {
        actualStart = first;
      }
    }

    if (actualStart) {
      actualStart.isActualCycleStart = true;
    }
  }

  return sequentialFlow;
}

function calculateStageFromStatusChangeEvent(event: StatusChange, workflow: WorkflowDefinition): WorkflowStage {
  const calculatedStage = event.isAddedToSprint ?
    workflow.stages.find(s => s.isAddedToSprint) :
    findStageByStatus(workflow, event.to);

  const firstStage = workflow.stages[0];
  if (!firstStage) {
    throw new Error('Workflow must have at least one stage');
  }
  
  return calculatedStage ?? firstStage;
}

