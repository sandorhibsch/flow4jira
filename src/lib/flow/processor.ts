// src/lib/flow/processor.ts

import { JiraIssue, JiraChangelogResponse } from '@/lib/jira/types';
import { FLOW_STATUS_MAPPING, FlowStage, getFlowStage } from '@/lib/jira/filters';

export interface FlowIssueTransition {
  stage: FlowStage;
  status: string; // The actual Jira status name
  enteredAt: Date | null; // When the issue entered this stage
  exitedAt: Date | null; // When it left this stage (null if still in stage)
  durationMs: number; // How long it spent in this stage (0 if still in stage)
}

export interface ProcessedFlowIssue {
  key: string;
  summary: string;
  issueType: string;
  created: Date;
  statusHistory: FlowIssueTransition[];
  currentStage: FlowStage;
  currentStatus: string;

  // Calculated metrics
  leadTime: number; // Total time from creation to done (ms)
  cycleTime: number; // Time from first "in-progress" to done (ms)
  daysOld: number; // How many days since creation
}

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
  const statusHistory = buildStatusHistory(issue, changelog);

  // Calculate metrics
  const leadTime = calculateLeadTime(created, statusHistory);
  const cycleTime = calculateCycleTime(statusHistory);
  const daysOld = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));

  return {
    key: issue.key,
    summary: issue.fields.summary,
    issueType: issue.fields.issuetype.name,
    created,
    statusHistory,
    currentStage,
    currentStatus,
    leadTime,
    cycleTime,
    daysOld
  };
}

/**
 * Build complete status history by parsing changelog
 * 
 * This walks through the changelog and identifies all status transitions,
 * then calculates how long the issue spent in each flow stage.
 */
function buildStatusHistory(
  issue: JiraIssue,
  changelog?: JiraChangelogResponse
): FlowIssueTransition[] {
  const transitions: FlowIssueTransition[] = [];
  const created = new Date(issue.fields.created);

  // If no changelog, we only know current status
  if (!changelog || !changelog.values || changelog.values.length === 0) {
    const currentStage = getFlowStage(issue.fields.status.name);
    return [{
      stage: currentStage,
      status: issue.fields.status.name,
      enteredAt: created,
      exitedAt: null,
      durationMs: Date.now() - created.getTime()
    }];
  }

  // Parse changelog entries looking for status changes
  const statusChanges: Array<{ timestamp: Date; status: string }> = [];

  changelog.values.forEach(entry => {
    entry.items.forEach(item => {
      if (item.field === 'status') {
        statusChanges.push({
          timestamp: new Date(entry.created),
          status: item.toString || item.to || 'Unknown'
        });
      }
    });
  });

  // If no status changes found, treat as only having current status
  if (statusChanges.length === 0) {
    const currentStage = getFlowStage(issue.fields.status.name);
    return [{
      stage: currentStage,
      status: issue.fields.status.name,
      enteredAt: created,
      exitedAt: null,
      durationMs: Date.now() - created.getTime()
    }];
  }

  // Build transitions: start with creation, then follow status changes
  const transitionDates = [created, ...statusChanges.map(sc => sc.timestamp)];
  const transitionStatuses = [
    'New', // Assume new issues start as "New"
    ...statusChanges.map(sc => sc.status)
  ];

  // Map consecutive status changes to transitions through flow stages
  for (let i = 0; i < transitionStatuses.length - 1; i++) {
    const status = transitionStatuses[i];
    const stage = getFlowStage(status);
    const enteredAt = transitionDates[i];
    const exitedAt = transitionDates[i + 1];
    const durationMs = exitedAt.getTime() - enteredAt.getTime();

    transitions.push({
      stage,
      status,
      enteredAt,
      exitedAt,
      durationMs
    });
  }

  // Add current status
  const lastTransitionDate = transitionDates[transitionDates.length - 1];
  const currentStatus = issue.fields.status.name;
  const currentStage = getFlowStage(currentStatus);
  const durationInCurrent = Date.now() - lastTransitionDate.getTime();

  transitions.push({
    stage: currentStage,
    status: currentStatus,
    enteredAt: lastTransitionDate,
    exitedAt: null,
    durationMs: durationInCurrent
  });

  return transitions;
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
    return doneTransition.enteredAt.getTime() - created.getTime();
  }

  // Not yet done
  return 0;
}

/**
 * Calculate cycle time: time from first "in-progress" to completion
 * Returns milliseconds, or 0 if not yet in progress
 */
function calculateCycleTime(statusHistory: FlowIssueTransition[]): number {
  // Find first in-progress entry
  const firstInProgress = statusHistory.find(t => t.stage === 'in-progress');
  if (!firstInProgress || !firstInProgress.enteredAt) {
    return 0;
  }

  // Find when it reached done
  const doneTransition = statusHistory.find(t => t.stage === 'done');
  if (doneTransition && doneTransition.enteredAt) {
    // Cycle time is from entering in-progress to entering done
    return doneTransition.enteredAt.getTime() - firstInProgress.enteredAt.getTime();
  }

  // Not yet done
  return 0;
}

/**
 * Batch process multiple issues
 */
export function processJiraIssues(
  issues: Array<{ issue: JiraIssue; changelog?: JiraChangelogResponse }>
): ProcessedFlowIssue[] {
  return issues.map(({ issue, changelog }) => processJiraIssue(issue, changelog));
}

/**
 * Helper to convert milliseconds to days for readability
 */
export function msToDays(ms: number): number {
  return Math.round(ms / (1000 * 60 * 60 * 24) * 10) / 10; // 1 decimal place
}