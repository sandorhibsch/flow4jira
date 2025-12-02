'use client';

import { ProcessedFlowIssue } from "@/lib/flow/flow-types";
import React from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

import { WorkflowDefinition, WorkflowStage } from "@/lib/jira/workflow-config";

type Point = {
  key: string;
  x: string; // stage name
  y: number; // age in days
  summary?: string;
  url?: string;
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as Point;
  return (
    <div className="bg-white p-2 rounded shadow border text-sm">
      <div><strong>{p.key}</strong></div>
      {p.summary && <div className="truncate w-64">{p.summary}</div>}
      <div>Age: {p.y.toFixed(0)} days</div>
      {p.url && (
        <div>
          <a
            href={p.url}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 underline"
          >
            Open in Jira
          </a>
        </div>
      )}
    </div>
  );
};

export default function AgingScatterplot({ issues, workflow }: { issues: ProcessedFlowIssue[], workflow: WorkflowDefinition }) {
  const workflowStages: WorkflowStage[] = workflow.stages;

  const orderMap = React.useMemo(() => {
    const map: Record<string, number> = {};
    workflowStages.forEach((w, idx) => (map[w.key] = idx));
    return map;
  }, [workflowStages]);

  const data = React.useMemo(() => {
    return issues
      .filter(i => i.currentStage.stageType != 'done')
      .map((i) => ({
        key: i.key,
        x: i.currentStage.name,
        y: i.ageDays ?? NaN,
        xKey: i.currentStage.key,
        summary: i.summary,
        //entered: i.enteredCurrentStageAt,
        //url: i.url,
      }))
      .filter((d) => orderMap[d.xKey] !== undefined)
      .sort((a, b) => orderMap[a.xKey] - orderMap[b.xKey]);
  }, [issues, orderMap]);
  //const data = React.useMemo(() => prepareData(issues), [issues]);

  return (
    <div style={{ width: "100%", height: 420 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart
          margin={{ top: 20, right: 20, bottom: 30, left: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis
            dataKey="x"
            type="category"
            name="Stage"
            allowDuplicatedCategory={false}
            domain={workflowStages.map(s => s.key)}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            dataKey="y"
            name="Age (days)"
            domain={[0, "dataMax + 1"]}
            tick={{ fontSize: 12 }}
          />

          <Tooltip content={<CustomTooltip />} />

          <Scatter
            name="issues"
            data={data}
            fill="#6366F1"
            shape="circle"
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
