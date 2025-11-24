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
  ReferenceLine,
} from "recharts";

type ScatterPlotPoint = {
  key: string;
  x: number; // timestamp in ms
  y: number; // cycle time in days
  summary?: string;
  doneDate?: Date;
  url?: string;
};

function prepareData(issues: ProcessedFlowIssue[], dateMin: number): ScatterPlotPoint[] {
  return issues
    .filter(i => i.done && new Date(i.done).getTime() >= dateMin)
    .map((i) => {
      const doneTimestamp = i.done ? new Date(i.done).getTime() : new Date().getTime();
      const y = i.cycleTimeDays;
      return {
        key: i.key,
        x: doneTimestamp ?? NaN,
        y: y ?? NaN,
        summary: i.summary,
        doneDate: new Date(doneTimestamp),
        //url: i.url,
      };
    })
    .sort((a, b) => a.x - b.x);
}

function computePercentiles(data: ScatterPlotPoint[], percentiles = [50, 85, 95]) {
  if (!data.length) return {};

  const sorted = [...data].sort((a, b) => a.y - b.y);
  const get = (p: number) => {
    const pos = (p / 100) * (sorted.length - 1);
    const base = Math.floor(pos);

    const rest = pos - base;
    if (sorted[rest + 1] !== undefined) {
      return sorted[base].y + rest * (sorted[base + 1].y - sorted[base].y);
    } else {
      return sorted[base].y;
    }
  };

  return Object.fromEntries(percentiles.map((p) => [p, get(p)]));
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as ScatterPlotPoint;
  return (
    <div className="bg-white p-2 rounded shadow border text-sm">
      <div><strong>{p.key}</strong></div>
      {p.summary && <div className="truncate w-64">{p.summary}</div>}
      <div>
        Done: {p.doneDate ? p.doneDate.toLocaleDateString() : "—"}
      </div>
      <div>Cycle time: {p.y.toFixed(0)} days</div>
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

export default function CycleTimeScatterplot({
  issues,
  periodDays
}: {
  issues: ProcessedFlowIssue[];
  periodDays: number;
}) {
  const dateMax = new Date().setHours(23, 59, 59, 999);
  const dateMin = dateMax - (periodDays * 24 * 60 * 60 * 1000);
  const data = React.useMemo(() => prepareData(issues, dateMin), [issues]);
  const percentiles = React.useMemo(() => computePercentiles(data), [data]);

  return (
    <div style={{ width: "100%" }}>
      <div className="flex flex-row">
        <div className="gap-4 mb-6 mt-6">
          <div className="bg-white p-4 mb-4 rounded-lg shadow max-h-24 gap-4">
            <div className="text-sm text-grey-800">50% certainty</div>
            <div className="text-2xl font-bold text-red-600">{percentiles[50]}d</div>
          </div>

          <div className="bg-white p-4 mb-4 rounded-lg shadow max-h-24 gap-4">
            <div className="text-sm text-grey-800">85% certainty</div>
            <div className="text-2xl font-bold text-green-600">{percentiles[85]}d</div>
          </div>

          <div className="bg-white p-4 mb-4 rounded-lg shadow max-h-24 gap-4">
            <div className="text-sm text-grey-800">95% certainty</div>
            <div className="text-2xl font-bold text-blue-600">{percentiles[95]}d</div>
          </div>

        </div>
        <ResponsiveContainer width="100%" aspect={2}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 30, left: 20 }}>
            <CartesianGrid strokeDasharray="1 1" />
            <XAxis
              dataKey="x"
              name="Completed"
              type="number"
              domain={[
                dateMin,
                dateMax]
              }
              tickFormatter={(v) => new Date(v).toLocaleDateString()}
              tick={{ fontSize: 14 }}
            />
            <YAxis
              dataKey="y"
              name="Cycle Time (days)"
              domain={[0, "dataMax + 1"]}
              tick={{ fontSize: 14 }}
            />
            <Tooltip content={<CustomTooltip />} />

            {Object.entries(percentiles).map(([p, value]) => (
              <ReferenceLine
                key={p}
                y={value}
                stroke={
                  p === "50"
                    ? "#f97316"
                    : p === "85"
                      ? "#22c55e"
                      : "#ef4444"
                }
                strokeDasharray="4 4"
                label={{
                  value: `${p}% certainty: ${value.toFixed(0)}d`,
                  position: "insideTopRight",
                  fill:
                    p === "50"
                      ? "#9a3412"
                      : p === "85"
                        ? "#15803d"
                        : "#991b1b",
                  fontSize: 14,
                }}
              />
            ))}
            <Scatter
              name="issues"
              data={data}
              fill="#3182CE"
              shape="circle"
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
