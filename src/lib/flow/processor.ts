// src/lib/flow/processor.ts

import { JiraIssue, JiraChangelogResponse, FlowIssueSummary } from '@/lib/jira/types';
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
  leadTimeDays: number; // Total time from creation to done (days)
  cycleTimeDays: number; // Time from first "development" to done (days)
  ageDays: number; // How many days since creation
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
  const daysOld = calculateAge(created, currentStage);

  return {
    key: issue.key,
    summary: issue.fields.summary,
    issueType: issue.fields.issuetype.name,
    created,
    statusHistory,
    currentStage,
    currentStatus,
    leadTimeDays: leadTime,
    cycleTimeDays: cycleTime,
    ageDays: daysOld
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
  if (!changelog || !changelog.histories || changelog.histories.length === 0) {
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

  changelog.histories.forEach(entry => {
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
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function calculateSummary(issues: ProcessedFlowIssue[]): FlowIssueSummary {
  const total = issues.length;

  const doneIssues = issues.filter(i => i.currentStage === 'done');
  const inProgressIssues = issues.filter(i =>
    i.currentStage === 'analyze' ||
    i.currentStage === 'development' ||
    i.currentStage === 'deployment' ||
    i.currentStage === 'testing'
  );
  const openIssues = issues.filter(i => i.currentStage != 'done')
  const averageAge = openIssues.length > 0
    ? openIssues.reduce((sum, i) => sum + i.ageDays, 0) / openIssues.length
    : 0;

  const workInProgress = inProgressIssues.length;
  const averageCycletime = doneIssues.length > 0
    ? doneIssues.reduce((sum, i) => sum + i.cycleTimeDays, 0) / doneIssues.length
    : 0;
  return {
    total: total,
    averageAge: averageAge,
    workInProgress: workInProgress,
    averageCycletime: averageCycletime
  };
}