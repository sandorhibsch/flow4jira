import { addDays, eachDayOfInterval, isAfter, isBefore } from "date-fns";

import { WorkflowDefinition } from "../jira/workflow-config";
import { ProcessedFlowIssue } from "../flow/flow-types";

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
