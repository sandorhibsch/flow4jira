// src/lib/flow/processor.ts

import { JiraIssue, JiraChangelogResponse } from '@/lib/jira/jira-types';
import { ProcessedFlowIssue, FlowIssueTransition } from '@/lib/flow/flow-types';
import { FlowStage, getFlowStage } from '@/lib/jira/workflow-config';

/**
 * Transform raw Jira issue + changelog into ProcessedFlowIssue
 */
export function processJiraIssue(
  issue: JiraIssue,
  changelog?: JiraChangelogResponse
): ProcessedFlowIssue {
  const created = new Date(issue.fields.created);
  const currentStatus = issue.fields.status.name;
  const currentStage = getFlowStage(currentStatus);

  // Build status history from changelog
  const statusChanges = filterStatusChanges(issue, changelog);
  const flowHistory = buildFlowHistory(issue, statusChanges);

  // Calculate metrics
  const leadTime = calculateLeadTime(created, statusChanges);
  const cycleTime = calculateCycleTime(statusChanges);
  const daysOld = calculateAge(created, currentStage);

  return {
    key: issue.key,
    summary: issue.fields.summary,
    issueType: issue.fields.issuetype.name,
    created,
    flowHistory,
    currentStage,
    currentStatus,
    leadTimeDays: leadTime,
    cycleTimeDays: cycleTime,
    ageDays: daysOld
  };
}

export function filterStatusChanges(issue: JiraIssue, changelog?: JiraChangelogResponse): FlowIssueTransition[] {
  const created = new Date(issue.fields.created);
  if (!changelog || !changelog.histories || changelog.histories.length === 0) {
    const currentStage = getFlowStage(issue.fields.status.name);
    return [{
      stage: currentStage,
      status: issue.fields.status.name,
      enteredAt: created,
    }];
  }

  const histories = changelog.histories ?? [];

  // Flatten only status changes
  const statusChanges: FlowIssueTransition[] = histories.flatMap(history => {
    const transitionDate = new Date(history.created);
    return history.items
      .filter(item => item.field === 'status')
      .map(item => ({
        stage: getFlowStage(item.toString ?? item.to ?? 'backlog'),
        status: item.toString ?? item.to ?? 'backlog',
        enteredAt: transitionDate,
      }));
  });

  return statusChanges;
}

/**
 * Extract the first time an issue entered each flow stage
 * This handles cases where issues bounce back and forth between stages
 */
export function buildFlowHistory(issue: JiraIssue, statusChanges: FlowIssueTransition[]): FlowIssueTransition[] {
  // sort status changes chronologically ascending - 
  // this will ensure the chronologically first item gets into flow history
  statusChanges.sort((a, b) => a.enteredAt.getTime() - b.enteredAt.getTime());

  const history: FlowIssueTransition[] = [];
  const seenStages = new Set<FlowStage>();

  const initialStage: FlowStage = 'backlog';
  seenStages.add(initialStage);

  history.push({
    stage: initialStage,
    status: 'new',
    enteredAt: new Date(issue.fields.created),
  })

  // Walk through events and record the first time each stage is entered
  for (const event of statusChanges) {
    const toStatus = event.status ?? null;
    const toStage = event.stage ?? getFlowStage(toStatus ?? undefined);

    // If stage not recorded yet, add it
    if (!seenStages.has(toStage)) {
      history.push({
        stage: toStage,
        status: toStatus,
        enteredAt: event.enteredAt
      });
      seenStages.add(toStage);
    }
  }

  return history;
}

/**
 * Calculate lead time: time from creation to completion
 * Returns milliseconds, or 0 if not yet done
 */
function calculateLeadTime(
  created: Date,
  statusHistory: FlowIssueTransition[]
): number {
  // Find when issue reached "done" stage
  const doneTransition = statusHistory.find(t => t.stage === 'done');

  if (doneTransition && doneTransition.enteredAt) {
    // Lead time is from creation to when it entered "done"
    const leadTime = doneTransition.enteredAt.getTime() - created.getTime();
    return msToDays(leadTime);
  }

  // Not yet done
  return 0;
}

/**
 * Calculate cycle time: time from first "development" to completion
 * Returns milliseconds, or 0 if not yet in progress
 */
function calculateCycleTime(statusHistory: FlowIssueTransition[]): number {
  // Find first development entry
  const firstInProgress = statusHistory.find(t => t.stage === 'development');
  if (!firstInProgress || !firstInProgress.enteredAt) {
    return 0;
  }

  // Find when it reached done
  const doneTransition = statusHistory.find(t => t.stage === 'done');
  if (doneTransition && doneTransition.enteredAt) {
    // Cycle time is from entering development to entering done
    const cycleTime = doneTransition.enteredAt.getTime() - firstInProgress.enteredAt.getTime();
    return msToDays(cycleTime);
  }

  // Not yet done
  return 0;
}

/**
 * Calculate age: time from created until now if issue is not done yet
 */
function calculateAge(created: Date, currentStage: FlowStage) {
  return currentStage === 'done' ? 0 : msToDays(Date.now() - created.getTime());
}

/**
 * Helper to convert milliseconds to days for readability
 */
export function msToDays(ms: number): number {
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

