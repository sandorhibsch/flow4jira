'use client';

import type { ProcessedFlowIssue } from "@/lib/flow/flow-types";
import React, { useCallback, useMemo } from "react";
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

import type { WorkflowDefinition, WorkflowStage } from "@/lib/jira/workflow-config";

type Point = {
  key: string;
  x: string; // stage name
  y: number; // age in days
  xKey: string;
  summary?: string;
  url?: string;
  issueType: string;
};

interface TooltipPayload {
  payload: Point;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
}

// Color palette for issue types (colorblind-friendly)
const ISSUE_TYPE_COLORS: Record<string, string> = {
  'Story': '#4e79a7',
  'Bug': '#e15759',
  'Task': '#76b7b2',
  'Epic': '#9c755f',
  'Sub-task': '#f28e2b',
  'Subtask': '#f28e2b',
  'Improvement': '#59a14f',
  'New Feature': '#edc948',
  'Feature': '#edc948',
  'Technical Debt': '#b07aa1',
  'Spike': '#ff9da7',
  'Support': '#9c755f',
  'Incident': '#e15759',
  'Change Request': '#bab0ac',
};

const DEFAULT_COLORS = [
  '#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f',
  '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#bab0ac'
];

function getIssueTypeColor(issueType: string, colorMap: Map<string, string>): string {
  if (colorMap.has(issueType)) {
    return colorMap.get(issueType)!;
  }
  // Fallback to predefined colors or assign new one
  if (ISSUE_TYPE_COLORS[issueType]) {
    colorMap.set(issueType, ISSUE_TYPE_COLORS[issueType]);
    return ISSUE_TYPE_COLORS[issueType];
  }
  // Assign next available color
  const usedColors = new Set(colorMap.values());
  const availableColor = DEFAULT_COLORS.find(c => !usedColors.has(c)) || DEFAULT_COLORS[colorMap.size % DEFAULT_COLORS.length];
  colorMap.set(issueType, availableColor!);
  return availableColor!;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  const firstPayload = payload[0];
  if (!firstPayload) return null;
  const p = firstPayload.payload as Point;
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
  const workflowStages: WorkflowStage[] = workflow.stages;

  const orderMap = useMemo(() => {
    const map: Record<string, number> = {};
    workflowStages.forEach((w, idx) => (map[w.key] = idx));
    return map;
  }, [workflowStages]);

  const data = useMemo(() => {
    return issues
      .filter(i => i.currentStage.stageType != 'done')
      .map((i) => ({
        key: i.key,
        x: i.currentStage.name,
        y: i.ageDays ?? NaN,
        xKey: i.currentStage.key,
        summary: i.summary,
        url: i.url,
        issueType: i.issueType,
      }))
      .filter((d) => orderMap[d.xKey] !== undefined)
      .sort((a, b) => (orderMap[a.xKey] ?? 0) - (orderMap[b.xKey] ?? 0));
  }, [issues, orderMap]);

  // Build color map for issue types
  const { colorMap, issueTypes } = useMemo(() => {
    const map = new Map<string, string>();
    const types = new Set<string>();
    data.forEach(d => {
      types.add(d.issueType);
      getIssueTypeColor(d.issueType, map);
    });
    return { colorMap: map, issueTypes: Array.from(types).sort() };
  }, [data]);

  // Handle click on scatter point
  const handlePointClick = useCallback((point: Point) => {
    if (point.url) {
      window.open(point.url, '_blank', 'noopener,noreferrer');
    }
  }, []);

  return (
    <div style={{ width: "100%" }}>
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
              onClick={(data) => handlePointClick(data as unknown as Point)}
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
