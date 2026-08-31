'use client';

import type { ProcessedFlowIssue } from "@/lib/flow/flow-types";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { buildCycleTimeScatterplotModel, type CycleTimePoint } from '@/lib/metrics/cycle-time-scatterplot-model';

interface TooltipPayload {
  payload: CycleTimePoint;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  const firstPayload = payload[0];
  if (!firstPayload) return null;
  const p = firstPayload.payload;
  return (
    <div className="bg-white p-2 rounded shadow border text-sm">
      <div><strong>{p.key}</strong></div>
      <div className="text-xs text-gray-500">{p.issueType}</div>
      {p.summary && <div className="truncate w-64">{p.summary}</div>}
      <div>
        Done: {p.doneDate ? p.doneDate.toLocaleDateString() : "—"}
      </div>
      <div>Cycle time: {p.y.toFixed(0)} days</div>
      {p.url && (
        <div className="text-blue-600 text-xs mt-1">
          Click to open in Jira →
        </div>
      )}
    </div>
  );
};

// Custom legend component
function IssueTypeLegend({ issueTypes, colorMap }: { issueTypes: string[], colorMap: Map<string, string> }) {
  return (
    <div className="flex flex-wrap gap-3 mt-4 justify-center">
      {issueTypes.map(type => (
        <div key={type} className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: colorMap.get(type) }}
          />
          <span className="text-xs text-gray-600">{type}</span>
        </div>
      ))}
    </div>
  );
}

export default function CycleTimeScatterplot({
  issues,
  periodDays
}: {
  issues: ProcessedFlowIssue[];
  periodDays: number;
}) {
  const [period, setPeriod] = useState(periodDays);

  useEffect(() => {
    setPeriod(periodDays);
  }, [periodDays]);

  const model = useMemo(
    () => buildCycleTimeScatterplotModel(issues, period, new Date()),
    [issues, period]
  );
  const { points: data, percentiles, certaintyDays, colorMap, issueTypes, dateMin, dateMax } = model;

  // Handle click on scatter point
  const handlePointClick = useCallback((point: CycleTimePoint) => {
    if (point.url) {
      window.open(point.url, '_blank', 'noopener,noreferrer');
    }
  }, []);

  return (
    <div style={{ width: "100%" }}>
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
      {data.length === 0 && (
        <div role="status" className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center text-gray-600">
          No completed issues are available for the selected period.
        </div>
      )}
      <div className="flex flex-row">
        <div className="gap-4 mb-6 mt-6">
          <div className="bg-white p-4 mb-4 rounded-lg shadow max-h-24 gap-4">
            <div className="text-sm text-grey-800">50% certainty</div>
            <div className="text-2xl font-bold text-orange-500">{certaintyDays[50] === null ? '—' : `${certaintyDays[50]}d`}</div>
          </div>

          <div className="bg-white p-4 mb-4 rounded-lg shadow max-h-24 gap-4">
            <div className="text-sm text-grey-800">85% certainty</div>
            <div className="text-2xl font-bold text-green-500">{certaintyDays[85] === null ? '—' : `${certaintyDays[85]}d`}</div>
          </div>

          <div className="bg-white p-4 mb-4 rounded-lg shadow max-h-24 gap-4">
            <div className="text-sm text-grey-800">95% certainty</div>
            <div className="text-2xl font-bold text-blue-500">{certaintyDays[95] === null ? '—' : `${certaintyDays[95]}d`}</div>
          </div>

        </div>
        <div className="flex-1">
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
                      ? "orange"
                      : p === "85"
                        ? "green"
                        : "blue"
                  }
                  strokeDasharray="4 4"
                  label={{
                    value: `${p}% certainty: ${value.toFixed(0)}d`,
                    position: "insideTopRight",
                    fill:
                      p === "50"
                        ? "orange"
                        : p === "85"
                          ? "green"
                          : "blue",
                    fontSize: 14,
                  }}
                />
              ))}
              <Scatter
                name="issues"
                data={data}
                fill="#3182CE"
                shape="circle"
                onClick={(data) => handlePointClick(data as unknown as CycleTimePoint)}
                cursor="pointer"
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={colorMap.get(entry.issueType) ?? '#94A3B8'}
                    style={{ cursor: entry.url ? 'pointer' : 'default' }}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          <IssueTypeLegend issueTypes={issueTypes} colorMap={colorMap} />
        </div>
      </div>
    </div>
  );
}
