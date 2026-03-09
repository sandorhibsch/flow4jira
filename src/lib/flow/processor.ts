// src/lib/flow/processor.ts

import type { JiraIssue, JiraChangelogResponse } from '@/lib/jira/jira-types';
import type { ProcessedFlowIssue } from '@/lib/flow/flow-types';
import type { WorkflowDefinition, WorkflowStage } from '@/lib/jira/workflow-config';
import { findStageByStatus } from '@/lib/jira/workflow-config';
import { filterStatusChanges } from './history-builder';
import type { SequentialStageEntry } from './sequential-flow-builder';
import { buildSequentialFlow } from './sequential-flow-builder';

/**
 * Transform raw Jira issue + changelog into ProcessedFlowIssue
 */
export function processJiraIssue(
  workflow: WorkflowDefinition,
  issue: JiraIssue,
  changelog?: JiraChangelogResponse
): ProcessedFlowIssue {

  const url = new URL(issue.self);
  const issueUrl = `${url.origin}/browse/${issue.key}`;

  const created = new Date(issue.fields.created);
  const currentStatus = issue.fields.status.name;
  const currentStage = findStageByStatus(workflow, currentStatus);

  // Build status history from changelog
  const statusChanges = filterStatusChanges(issue, changelog);
  const flowHistory = buildSequentialFlow(workflow, created, statusChanges);

  // set done date from flow history
  const doneTransitionIndex = flowHistory.findIndex(e => e.stage.isCycleEnd);
  const doneDate = doneTransitionIndex === -1 ? undefined : flowHistory[doneTransitionIndex]?.enteredAt;

  // Calculate metrics
  const leadTime = calculateLeadTime(created, flowHistory);
  const cycleTime = calculateCycleTime(flowHistory);
  const daysOld = calculateAge(created, flowHistory);

  return {
    key: issue.key,
    summary: issue.fields.summary,
    issueType: issue.fields.issuetype.name,
    created: created,
    flowHistory: flowHistory,
    currentStage: currentStage,
    currentStatus: currentStatus,
    done: doneDate,
    url: issueUrl,
    leadTimeDays: leadTime,
    cycleTimeDays: cycleTime,
    ageDays: daysOld
  };
}

function calculateLeadTime(
  created: Date,
  flowHistory: SequentialStageEntry[]
): number {
  const doneTransition = flowHistory.find(t => t.stage.isCycleEnd);

  if (doneTransition && doneTransition.enteredAt) {
    const leadTime = doneTransition.enteredAt.getTime() - created.getTime();
    return msToDays(leadTime);
  }
  return 0;
}

function calculateCycleTime(flowHistory: SequentialStageEntry[]): number {
  const firstInProgress = flowHistory.find(t => t.isActualCycleStart);
  if (!firstInProgress || !firstInProgress.enteredAt) {
    return 0;
  }

  const doneTransition = flowHistory.find(t => t.stage.isCycleEnd);
  if (doneTransition && doneTransition.enteredAt) {
    const cycleTime = doneTransition.enteredAt.getTime() - firstInProgress.enteredAt.getTime();
    return msToDays(cycleTime);
  }

  return 0;
}
function calculateAge(created: Date, flowHistory: SequentialStageEntry[]) {
  const doneTransition = flowHistory.find(t => t.stage.isCycleEnd);
  // Subtract 1ms to avoid off-by-one when rounding up due to tiny timing differences
  return doneTransition ? 0 : msToDays(Date.now() - created.getTime() - 1);
}

export function msToDays(ms: number): number {
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

