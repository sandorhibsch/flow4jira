"use client";

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { LegendPayload } from 'recharts/types/component/DefaultLegendContent';
import { format } from "date-fns";
import { WorkflowDefinition } from "@/lib/jira/workflow-config";
import { buildCumulativeFlowData } from "@/lib/metrics/cfd-builder";
import { ProcessedFlowIssue } from "@/lib/flow/flow-types";

export default function CumulativeFlowDiagram({ issues, workflow }: { issues: ProcessedFlowIssue[], workflow: WorkflowDefinition }) {
  const data = React.useMemo(() => buildCumulativeFlowData(issues, workflow, 60), [issues, workflow]);

  const stages = workflow.stages.filter(s => s.stageType != 'new');
  const reverseStages = [...stages].reverse();

  return (
    <div style={{ width: "100%" }}>
      <ResponsiveContainer width="100%" aspect={2}>
        <AreaChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={(d) => format(new Date(d), "MMM d")}
            tick={{ fontSize: 12 }}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            labelFormatter={(d) => format(new Date(d), "PP")}
            formatter={(v, k) => [v, stages.map(s => s.key).find((w) => w === k)]}
          />
          <Legend />

          {reverseStages.map((stage) => (
            <Area
              key={stage.key}
              type="monotone"
              dataKey={stage.key}
              stackId="1"
              fill={stage.color}
              stroke={stage.color}
              animationDuration={300}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
