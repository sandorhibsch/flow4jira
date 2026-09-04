'use client';

import type { ProcessedFlowIssue } from "@/lib/flow/flow-types";
import React, { useCallback, useMemo, useState } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { WorkflowDefinition } from "@/lib/jira/workflow-config";
import { buildAgingScatterplotModel, type AgingPoint } from '@/lib/metrics/aging-scatterplot-model';

interface TooltipPayload {
  payload: AgingPoint;
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
      <div>Age: {p.y.toFixed(0)} days</div>
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

export default function AgingScatterplot({ issues, workflow }: { issues: ProcessedFlowIssue[], workflow: WorkflowDefinition }) {
  const workflowStages = workflow.stages;

  // Switch: show total age (default) or only in-process (cycle) age
  const [showCycleAge, setShowCycleAge] = useState(false);

  const { points: data, colorMap, issueTypes } = useMemo(
    () => buildAgingScatterplotModel(issues, workflow, showCycleAge ? 'cycle' : 'total', new Date()),
    [issues, workflow, showCycleAge]
  );

  // Handle click on scatter point
  const handlePointClick = useCallback((point: AgingPoint) => {
    if (point.url) {
      window.open(point.url, '_blank', 'noopener,noreferrer');
    }
  }, []);

  return (
    <div style={{ width: "100%" }}>
      {/* Switch for age mode */}
      <div className="flex items-center gap-3 mb-2">
        <label className="text-xs font-medium text-gray-700">Show:</label>
        <button
          className={`px-2 py-1 rounded text-xs border ${!showCycleAge ? 'bg-blue-100 border-blue-400 text-blue-800' : 'bg-white border-gray-300 text-gray-700'}`}
          onClick={() => setShowCycleAge(false)}
        >
          Total Age (created → now)
        </button>
        <button
          className={`px-2 py-1 rounded text-xs border ${showCycleAge ? 'bg-green-100 border-green-400 text-green-800' : 'bg-white border-gray-300 text-gray-700'}`}
          onClick={() => setShowCycleAge(true)}
        >
          In-Process Age (cycle start → now)
        </button>
      </div>
      {data.length === 0 && (
        <div role="status" className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center text-gray-600">
          No active issues are available for this age view.
        </div>
      )}
      <div style={{ height: 420 }}>
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
              domain={workflowStages.map(s => s.name)}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              dataKey="y"
              name={showCycleAge ? "In-Process Age (days)" : "Age (days)"}
              domain={[0, "dataMax + 1"]}
              tick={{ fontSize: 12 }}
            />

            <Tooltip content={<CustomTooltip />} />

            <Scatter
              name="issues"
              data={data}
              fill="#6366F1"
              shape="circle"
              onClick={(data) => handlePointClick(data as unknown as AgingPoint)}
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
      </div>
      <IssueTypeLegend issueTypes={issueTypes} colorMap={colorMap} />
    </div>
  );
}
