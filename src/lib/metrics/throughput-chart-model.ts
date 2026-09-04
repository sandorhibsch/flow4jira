import type { ProcessedFlowIssue } from '../flow/flow-types';

export interface WeeklyThroughput {
  label: string;
  count: number;
  startDate: Date;
  endDate: Date;
  issues: string[];
}

export interface ThroughputStatistics {
  avg: number;
  median: number;
  stdDev: number;
}

export interface ThroughputChartModel {
  weeks: WeeklyThroughput[];
  statistics: ThroughputStatistics;
  totalCompleted: number;
}

export function getWeekStart(date: Date): Date {
  const weekStart = new Date(date);
  const day = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() - day + (day === 0 ? -6 : 1));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

export function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
}

export function calculateWeeklyThroughput(
  issues: ProcessedFlowIssue[],
  periodDays: number,
  now: Date
): WeeklyThroughput[] {
  if (!Number.isFinite(periodDays) || periodDays <= 0) return [];

  const periodEnd = new Date(now);
  periodEnd.setHours(23, 59, 59, 999);
  const periodStart = new Date(periodEnd);
  periodStart.setDate(periodStart.getDate() - periodDays);
  periodStart.setHours(0, 0, 0, 0);

  const weeksByStart = new Map<number, WeeklyThroughput>();
  for (const issue of issues) {
    if (!issue.done) continue;
    const doneDate = new Date(issue.done);
    if (doneDate < periodStart || doneDate > periodEnd) continue;

    const weekStart = getWeekStart(doneDate);
    const weekKey = weekStart.getTime();
    const existingWeek = weeksByStart.get(weekKey);
    if (existingWeek) {
      existingWeek.count += 1;
      existingWeek.issues.push(issue.key);
      continue;
    }

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    weeksByStart.set(weekKey, {
      label: formatShortDate(weekStart),
      count: 1,
      startDate: weekStart,
      endDate: weekEnd,
      issues: [issue.key],
    });
  }

  const populatedWeeks = [...weeksByStart.values()]
    .sort((left, right) => left.startDate.getTime() - right.startDate.getTime());
  if (populatedWeeks.length === 0) return [];

  const lastWeek = populatedWeeks[populatedWeeks.length - 1]!;
  const populatedByStart = new Map(populatedWeeks.map(week => [week.startDate.getTime(), week]));
  const result: WeeklyThroughput[] = [];
  const currentWeekStart = new Date(populatedWeeks[0]!.startDate);

  while (currentWeekStart <= lastWeek.startDate) {
    const existingWeek = populatedByStart.get(currentWeekStart.getTime());
    if (existingWeek) {
      result.push(existingWeek);
    } else {
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      result.push({
        label: formatShortDate(currentWeekStart),
        count: 0,
        startDate: new Date(currentWeekStart),
        endDate: weekEnd,
        issues: [],
      });
    }
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
  }

  return result;
}

export function calculateThroughputStatistics(data: WeeklyThroughput[]): ThroughputStatistics {
  if (data.length === 0) return { avg: 0, median: 0, stdDev: 0 };
  const counts = data.map(week => week.count);
  const avg = counts.reduce((sum, count) => sum + count, 0) / counts.length;
  const sorted = [...counts].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 1
    ? sorted[middle]!
    : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
  const variance = counts.reduce((sum, count) => sum + Math.pow(count - avg, 2), 0) / counts.length;
  return { avg, median, stdDev: Math.sqrt(variance) };
}

export function buildThroughputChartModel(
  issues: ProcessedFlowIssue[],
  periodDays: number,
  now: Date
): ThroughputChartModel {
  const weeks = calculateWeeklyThroughput(issues, periodDays, now);
  return {
    weeks,
    statistics: calculateThroughputStatistics(weeks),
    totalCompleted: weeks.reduce((sum, week) => sum + week.count, 0),
  };
}

export function getThroughputBarColor(count: number, statistics: ThroughputStatistics): string {
  if (count === 0) return '#e5e7eb';
  if (count >= statistics.avg + statistics.stdDev) return '#22c55e';
  if (count <= statistics.avg - statistics.stdDev) return '#f97316';
  return '#3b82f6';
}
