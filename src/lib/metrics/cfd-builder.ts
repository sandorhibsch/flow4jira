import { addDays, eachDayOfInterval, isAfter, isBefore } from "date-fns";

import type { WorkflowDefinition, WorkflowStage } from "../jira/workflow-config";
import type { ProcessedFlowIssue } from "../flow/flow-types";

export function buildCumulativeFlowData(
  issues: ProcessedFlowIssue[],
  workflow: WorkflowDefinition,
  periodDays = 90
) {
  const now = new Date();
  const startDate = addDays(now, -periodDays);
  const allDates = eachDayOfInterval({ start: startDate, end: now });

  const workflowStages = workflow.stages.filter(s => s.stageType != 'new');
  // orderMap: stage.key -> index
  const orderMap = workflowStages.reduce<Record<string, number>>((acc, stage, idx) => {
    acc[stage.key] = idx;
    return acc;
  }, {});

  const cfdData = allDates.map((date) => {
    // create data point with stages in workflow order
    const point: Record<string, any> = { date };
    workflowStages.forEach((w) => (point[w.key] = 0));

    for (const issue of issues) {
      const entries = issue.flowHistory;

      for (let i = 0; i < entries.length; i++) {
        const current = entries[i];
        if (!current) continue;

        const entered = current.enteredAt;

        //do not count backlog 
        if (current.stage.stageType === 'new') continue;
        //do not count issues done before startDate
        if (current.stage.stageType === 'done' && isBefore(entered, startDate)) continue;

        const next = entries[i + 1];
        const left = next ? next.enteredAt : undefined;



        const inStage =
          (isAfter(date, entered)) &&
          (!left || isBefore(date, left));

        if (inStage) {
          if (orderMap[current.stage.key] !== undefined) {
            point[current.stage.key] += 1;
          }
          break;
        }
      }
    }

    return point;
  });

  // sort keys for consistency (in workflow order)
  const ordered = cfdData.map((d) => {
    const result: Record<string, any> = { date: d.date };
    workflowStages.forEach((w) => {
      result[w.key] = d[w.key] ?? 0;
    });
    return result;
  });

  return ordered;
}

export function calculateAverageThroughput(issues: ProcessedFlowIssue[], period: number): number {
  if (!issues.length || period === 0) return 0;

  const now = new Date();
  const start = new Date(now.getTime() - period * 24 * 60 * 60 * 1000);

  return (issues.filter(i => i.done && new Date(i.done) >= start).length / (period || 1));
}

export function calculateAverageWIP(data: Record<string, any>[], stages: WorkflowStage[]): number {
  if (!data.length) return 0;

  const wipStages = stages
    .filter(stage => stage.stageType === 'in-progress')
    .map(s => s.key);
  let totalWIP = 0;
  data.forEach(row => {
    totalWIP += wipStages.reduce((sum, key) => sum + (row[key] ?? 0), 0);
  });
  return totalWIP / (data.length || 1);
}

export function calculateAverageAge(issues: ProcessedFlowIssue[], period: number): number {
  if (!issues.length) return 0;

  const now = new Date();
  const periodStart = new Date(now.getTime() - period * 24 * 60 * 60 * 1000);

  const agingIssues = issues.filter(i => !i.done || new Date(i.done) > periodStart);
  if (!agingIssues.length) return 0;
  const totalAge = agingIssues.reduce((sum, i) => {
    const created = new Date(i.created);
    return sum + ((now.getTime() - created.getTime()) / (24 * 60 * 60 * 1000));
  }, 0);
  return (totalAge / agingIssues.length);
}

export function calculateAverageCT(issues: ProcessedFlowIssue[], period: number): number {
  if (!issues.length) return 0;

  const now = new Date();
  const periodStart = new Date(now.getTime() - period * 24 * 60 * 60 * 1000);

  const doneIssues = issues.filter(i => i.done && new Date(i.done) > periodStart);
  if (!doneIssues.length) return 0;
  const totalCycleTime = doneIssues.reduce((sum, i) => {
    return sum + (i.cycleTimeDays);
  }, 0);
  return (totalCycleTime / doneIssues.length || 1);
}