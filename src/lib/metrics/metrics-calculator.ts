import type { FlowIssueCalculatedMetrics, ProcessedFlowIssue } from "../flow/flow-types";

export function calculateSummary(issues: ProcessedFlowIssue[]): FlowIssueCalculatedMetrics {
  const total = issues.length;

  const doneIssues = issues.filter(i => i.currentStage.stageType === 'done');
  const inProgressIssues = issues.filter(i => i.currentStage.stageType === 'in-progress');
  const openIssues = issues.filter(i => i.currentStage.stageType != 'done')
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