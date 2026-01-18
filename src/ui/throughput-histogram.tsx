'use client';

import type { ProcessedFlowIssue } from "@/lib/flow/flow-types";
import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";

interface WeeklyData {
  label: string;
  count: number;
  startDate: Date;
  endDate: Date;
  issues: string[];
}

interface TooltipPayload {
  payload: WeeklyData;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
}

/**
 * Get the Monday of the week for a given date
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Format date as "MMM DD" (e.g., "Jan 08")
 */
function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
}

/**
 * Calculate weekly throughput from issues
 */
function calculateWeeklyThroughput(
  issues: ProcessedFlowIssue[],
  periodDays: number
): WeeklyData[] {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const periodStart = new Date(today);
  periodStart.setDate(periodStart.getDate() - periodDays);
  periodStart.setHours(0, 0, 0, 0);

  // Get completed issues within period
  const completedIssues = issues.filter(issue => {
    if (!issue.done) return false;
    const doneDate = new Date(issue.done);
    return doneDate >= periodStart && doneDate <= today;
  });

  // Group by week
  const weekMap = new Map<string, { count: number; startDate: Date; endDate: Date; issues: string[] }>();

  completedIssues.forEach(issue => {
    const doneDate = new Date(issue.done!);
    const weekStart = getWeekStart(doneDate);
    const weekKey = weekStart.toISOString().split('T')[0]!;

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, {
        count: 0,
        startDate: weekStart,
        endDate: weekEnd,
        issues: []
      });
    }

    const week = weekMap.get(weekKey)!;
    week.count++;
    week.issues.push(issue.key);
  });

  // Convert to array and sort by date
  const weeks = Array.from(weekMap.entries())
    .map(([, data]) => ({
      label: `${formatShortDate(data.startDate)}`,
      count: data.count,
      startDate: data.startDate,
      endDate: data.endDate,
      issues: data.issues,
    }))
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  // Fill in missing weeks with zero
  if (weeks.length > 0) {
    const firstWeek = weeks[0]!;
    const lastWeek = weeks[weeks.length - 1]!;
    const filledWeeks: WeeklyData[] = [];

    const currentWeekStart = new Date(firstWeek.startDate);

    while (currentWeekStart <= lastWeek.startDate) {
      const weekKey = currentWeekStart.toISOString().split('T')[0]!;
      const existingWeek = weeks.find(w =>
        w.startDate.toISOString().split('T')[0] === weekKey
      );

      if (existingWeek) {
        filledWeeks.push(existingWeek);
      } else {
        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        filledWeeks.push({
          label: formatShortDate(currentWeekStart),
          count: 0,
          startDate: new Date(currentWeekStart),
          endDate: weekEnd,
          issues: [],
        });
      }

      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }

    return filledWeeks;
  }

  return weeks;
}

/**
 * Calculate statistics
 */
function calculateStats(data: WeeklyData[]): { avg: number; median: number; stdDev: number } {
  if (data.length === 0) return { avg: 0, median: 0, stdDev: 0 };

  const counts = data.map(d => d.count);
  const sum = counts.reduce((a, b) => a + b, 0);
  const avg = sum / counts.length;

  // Median
  const sorted = [...counts].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 !== 0
    ? sorted[mid]!
    : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;

  // Standard Deviation
  const squaredDiffs = counts.map(c => Math.pow(c - avg, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / counts.length;
  const stdDev = Math.sqrt(avgSquaredDiff);

  return { avg, median, stdDev };
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  const firstPayload = payload[0];
  if (!firstPayload) return null;
  const p = firstPayload.payload;

  return (
    <div className="bg-white p-3 rounded shadow border text-sm">
      <div className="font-semibold text-gray-900">
        Week of {formatShortDate(p.startDate)}
      </div>
      <div className="text-gray-600 text-xs mb-2">
        {formatShortDate(p.startDate)} - {formatShortDate(p.endDate)}
      </div>
      <div className="text-lg font-bold text-blue-600">
        {p.count} {p.count === 1 ? 'item' : 'items'} completed
      </div>
      {p.issues.length > 0 && p.issues.length <= 5 && (
        <div className="mt-2 text-xs text-gray-500">
          {p.issues.join(', ')}
        </div>
      )}
      {p.issues.length > 5 && (
        <div className="mt-2 text-xs text-gray-500">
          {p.issues.slice(0, 5).join(', ')} +{p.issues.length - 5} more
        </div>
      )}
    </div>
  );
};

export default function ThroughputHistogram({
  issues,
  periodDays
}: {
  issues: ProcessedFlowIssue[];
  periodDays: number;
}) {
  const data = useMemo(() => calculateWeeklyThroughput(issues, periodDays), [issues, periodDays]);
  const stats = useMemo(() => calculateStats(data), [data]);

  const totalCompleted = useMemo(() =>
    data.reduce((sum, week) => sum + week.count, 0),
    [data]
  );

  // Color bars based on performance relative to average
  const getBarColor = (count: number): string => {
    if (count === 0) return '#e5e7eb'; // gray-200
    if (count >= stats.avg + stats.stdDev) return '#22c55e'; // green-500 - above average
    if (count <= stats.avg - stats.stdDev) return '#f97316'; // orange-500 - below average
    return '#3b82f6'; // blue-500 - normal
  };

  return (
    <div style={{ width: "100%" }}>
      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Completed</div>
          <div className="text-2xl font-bold text-gray-900">{totalCompleted}</div>
          <div className="text-xs text-gray-500">items in {data.length} weeks</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Weekly Average</div>
          <div className="text-2xl font-bold text-blue-600">{stats.avg.toFixed(1)}</div>
          <div className="text-xs text-gray-500">items/week</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Median</div>
          <div className="text-2xl font-bold text-purple-600">{stats.median.toFixed(1)}</div>
          <div className="text-xs text-gray-500">items/week</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Variability</div>
          <div className="text-2xl font-bold text-orange-600">±{stats.stdDev.toFixed(1)}</div>
          <div className="text-xs text-gray-500">std deviation</div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: 350 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11 }}
              angle={-45}
              textAnchor="end"
              height={60}
              interval={0}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              allowDecimals={false}
              domain={[0, 'dataMax + 2']}
              label={{
                value: 'Items Completed',
                angle: -90,
                position: 'insideLeft',
                style: { textAnchor: 'middle', fontSize: 12 }
              }}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Average line */}
            <ReferenceLine
              y={stats.avg}
              stroke="#3b82f6"
              strokeDasharray="4 4"
              label={{
                value: `Avg: ${stats.avg.toFixed(1)}`,
                position: 'right',
                fill: '#3b82f6',
                fontSize: 12,
              }}
            />

            <Bar
              dataKey="count"
              radius={[4, 4, 0, 0]}
              maxBarSize={50}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getBarColor(entry.count)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#22c55e' }} />
          <span className="text-xs text-gray-600">Above average (+1σ)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3b82f6' }} />
          <span className="text-xs text-gray-600">Normal</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f97316' }} />
          <span className="text-xs text-gray-600">Below average (-1σ)</span>
        </div>
      </div>
    </div>
  );
}
