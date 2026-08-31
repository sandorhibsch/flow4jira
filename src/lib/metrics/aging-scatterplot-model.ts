import { DefaultColors, IssueTypeColors } from '@/components/ui/color-palettes';
import type { ProcessedFlowIssue } from '../flow/flow-types';
import type { WorkflowDefinition } from '../jira/workflow-config';

const DAY_MS = 24 * 60 * 60 * 1000;

export type AgingMode = 'total' | 'cycle';

export interface AgingPoint {
  key: string;
  x: string;
  y: number;
  xKey: string;
  summary?: string;
  url?: string;
  issueType: string;
}

export interface AgingScatterplotModel {
  points: AgingPoint[];
  issueTypes: string[];
  colorMap: Map<string, string>;
}

export function buildAgingScatterplotModel(
  issues: ProcessedFlowIssue[],
  workflow: WorkflowDefinition,
  mode: AgingMode,
  now: Date
): AgingScatterplotModel {
  const stageOrder = new Map(workflow.stages.map((stage, index) => [stage.key, index]));
  const points = issues.flatMap(issue => {
    if (issue.currentStage.stageType === 'done') return [];
    if (mode === 'cycle' && issue.currentStage.stageType !== 'in-progress') return [];
    if (!stageOrder.has(issue.currentStage.key)) return [];

    const age = mode === 'cycle'
      ? calculateCycleAge(issue, now)
      : issue.ageDays;
    if (!Number.isFinite(age)) return [];

    return [{
      key: issue.key,
      x: issue.currentStage.name,
      y: Math.max(0, age),
      xKey: issue.currentStage.key,
      summary: issue.summary,
      url: issue.url,
      issueType: issue.issueType,
    }];
  }).sort((left, right) => stageOrder.get(left.xKey)! - stageOrder.get(right.xKey)!);

  const issueTypes = [...new Set(points.map(point => point.issueType))].sort();
  return { points, issueTypes, colorMap: buildIssueTypeColorMap(issueTypes) };
}

export function calculateCycleAge(issue: ProcessedFlowIssue, now: Date): number {
  const cycleStart = issue.flowHistory.find(entry => entry.isActualCycleStart)?.enteredAt;
  if (!cycleStart) return Number.NaN;
  return Math.ceil((now.getTime() - new Date(cycleStart).getTime()) / DAY_MS);
}

export function buildIssueTypeColorMap(issueTypes: string[]): Map<string, string> {
  const colorMap = new Map<string, string>();
  for (const issueType of issueTypes) {
    const predefinedColor = IssueTypeColors[issueType];
    if (predefinedColor) {
      colorMap.set(issueType, predefinedColor);
      continue;
    }
    const usedColors = new Set(colorMap.values());
    const availableColor = DefaultColors.find(color => !usedColors.has(color))
      ?? DefaultColors[colorMap.size % DefaultColors.length]!;
    colorMap.set(issueType, availableColor);
  }
  return colorMap;
}
