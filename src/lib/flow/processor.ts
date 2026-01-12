// src/lib/flow/processor.ts

import { JiraIssue, JiraChangelogResponse } from '@/lib/jira/jira-types';
import { ProcessedFlowIssue } from '@/lib/flow/flow-types';
import { findStageByStatus, WorkflowDefinition, WorkflowStage } from '@/lib/jira/workflow-config';
import { filterStatusChanges } from './history-builder';
import { buildSequentialFlow, SequentialStageEntry } from './sequential-flow-builder';

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
  const daysOld = calculateAge(created, currentStage);

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

/**
 * Calculate lead time: time from creation to completion
 * Returns milliseconds, or 0 if not yet done
 */
function calculateLeadTime(
  created: Date,
  statusHistory: SequentialStageEntry[]
): number {
  // Find when issue reached "done" stage
  const doneTransition = statusHistory.find(t => t.stage.stageType === 'done');

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
function calculateCycleTime(flowHistory: SequentialStageEntry[]): number {
  // Find first development entry
  const firstInProgress = flowHistory.find(t => t.isActualCycleStart);
  if (!firstInProgress || !firstInProgress.enteredAt) {
    return 0;
  }

  // Find when it reached done
  const doneTransition = flowHistory.find(t => t.stage.isCycleEnd);
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
function calculateAge(created: Date, currentStage: WorkflowStage) {
  return currentStage.isCycleEnd ? 0 : msToDays(Date.now() - created.getTime());
}

/**
 * Helper to convert milliseconds to days for readability
 */
export function msToDays(ms: number): number {
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

