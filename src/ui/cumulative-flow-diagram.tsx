"use client";

import React, { useEffect, useState, useMemo } from "react";
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

import { format } from "date-fns";
import type { WorkflowDefinition } from "@/lib/jira/workflow-config";
import { buildCumulativeFlowData, calculateAverageAge, calculateAverageCT, calculateAverageThroughput, calculateAverageWIP } from "@/lib/metrics/cfd-builder";
import type { ProcessedFlowIssue } from "@/lib/flow/flow-types";

export default function CumulativeFlowDiagram(
  {
    issues,
    workflow,
    periodDays }: {
      issues: ProcessedFlowIssue[],
      workflow: WorkflowDefinition,
      periodDays: number
    }) {

  const [period, setPeriod] = useState(periodDays);

  useEffect(() => {
    setPeriod(periodDays);
  }, [periodDays]);

  const data = useMemo(() => buildCumulativeFlowData(issues, workflow, period), [issues, workflow, period]);

  const stages = workflow.stages.filter(s => s.stageType != 'new');
  const reverseStages = [...stages].reverse();

  // --- Info card calculations ---
  const avgThroughputPerDay = useMemo(() => {
    return calculateAverageThroughput(issues, period).toFixed(2);
  }, [issues, period]);

  const avgWIP = useMemo(() => {
    return calculateAverageWIP(data, stages).toFixed(2);
  }, [data, stages]);

  const avgCycleTime = useMemo(() => {
    return calculateAverageCT(issues, period).toFixed(2);

  }, [issues, period])

  const avgAge = useMemo(() => {
    return calculateAverageAge(issues, period).toFixed(2);
  }, [issues, period]);

  return (
    <div style={{ width: '100%', padding: 20 }}>
      <p className="text-sm font-bold text-gray-900 mb-1">Analysis period: last {period} days</p>

      <input
        type="range"
        min={5}
        max={periodDays}
        step={1}
        value={period}
        onChange={e => setPeriod(Number(e.target.value))}
        style={{ width: '100%', marginBottom: 16, overflow: "hidden", backgroundColor: "#82ca9d" }}
      />

      {/* Info cards */}
      <div className="flex flex-row">
        <div className="gap-4 mb-6 mt-6">

          <div className="bg-white p-4 rounded-lg shadow max-h-24 gap-4">
            <div className="text-sm text-grey-800">Avg. TP</div>
            <div className="text-2xl font-bold text-orange-500">{avgThroughputPerDay}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow max-h-24 gap-4">
            <div className="text-sm text-grey-800">Avg. WIP</div>
            <div className="text-2xl font-bold text-amber-500">{avgWIP}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow max-h-24 gap-4">
            <div className="text-sm text-grey-800">Avg. CT</div>
            <div className="text-2xl font-bold text-fuchsia-500">{avgCycleTime}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow max-h-24 gap-4">
            <div className="text-sm text-grey-800">Avg. Age</div>
            <div className="text-2xl font-bold text-indigo-500">{avgAge}d</div>
          </div>
        </div>


        <div className="flex-1" >
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
                formatter={(v, k) => [v, stages.map(s => s.name).find((w) => w === k)]}
              />
              <Legend />

              {reverseStages.map((stage) => (
                <Area
                  key={stage.key}
                  type="monotone"
                  dataKey={stage.key}
                  name={stage.name}
                  stackId="1"
                  fill={stage.color}
                  stroke={stage.color}
                  animationDuration={300}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
