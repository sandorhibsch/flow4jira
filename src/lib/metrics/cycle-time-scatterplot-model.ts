import type { ProcessedFlowIssue } from '../flow/flow-types';
import { calculatePercentiles } from './percentiles';
import { buildIssueTypeColorMap } from './issue-type-color-model';

const DAY_MS = 24 * 60 * 60 * 1000;
const CERTAINTIES = [50, 85, 95] as const;

export interface CycleTimePoint {
  key: string;
  x: number;
  y: number;
  summary?: string;
  doneDate: Date;
  url?: string;
  issueType: string;
}

export interface CycleTimeScatterplotModel {
  points: CycleTimePoint[];
  percentiles: Record<number, number>;
  certaintyDays: Record<(typeof CERTAINTIES)[number], number | null>;
  issueTypes: string[];
  colorMap: Map<string, string>;
  dateMin: number;
  dateMax: number;
}

export function buildCycleTimeScatterplotModel(
  issues: ProcessedFlowIssue[],
  periodDays: number,
  now: Date
): CycleTimeScatterplotModel {
  const dateMax = new Date(now).setHours(23, 59, 59, 999);
  const dateMin = dateMax - Math.max(0, periodDays) * DAY_MS;
  const points = Number.isFinite(periodDays) && periodDays > 0
    ? issues.flatMap(issue => {
      if (!issue.done || !Number.isFinite(issue.cycleTimeDays)) return [];
      const doneTimestamp = new Date(issue.done).getTime();
      if (doneTimestamp < dateMin || doneTimestamp > dateMax) return [];
      return [{
        key: issue.key,
        x: doneTimestamp,
        y: issue.cycleTimeDays,
        summary: issue.summary,
        doneDate: new Date(doneTimestamp),
        url: issue.url,
        issueType: issue.issueType,
      }];
    }).sort((left, right) => left.x - right.x)
    : [];

  const percentiles = calculatePercentiles(points.map(point => point.y));
  const certaintyDays = Object.fromEntries(CERTAINTIES.map(certainty => [
    certainty,
    percentiles[certainty] === undefined ? null : Math.ceil(percentiles[certainty]),
  ])) as CycleTimeScatterplotModel['certaintyDays'];
  const issueTypes = [...new Set(points.map(point => point.issueType))].sort();

  return {
    points,
    percentiles,
    certaintyDays,
    issueTypes,
    colorMap: buildIssueTypeColorMap(issueTypes),
    dateMin,
    dateMax,
  };
}
