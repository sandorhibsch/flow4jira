'use client';

import type { ProcessedFlowIssue } from "@/lib/flow/flow-types";
import React, { useMemo } from "react";
import {
  buildThroughputChartModel,
  formatShortDate,
  getThroughputBarColor,
  type WeeklyThroughput,
} from '@/lib/metrics/throughput-chart-model';
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

interface TooltipPayload {
  payload: WeeklyThroughput;
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
  const model = useMemo(
    () => buildThroughputChartModel(issues, periodDays, new Date()),
    [issues, periodDays]
  );
  const { weeks: data, statistics: stats, totalCompleted } = model;

  return (
    <div style={{ width: "100%" }}>
      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Completed</div>
          <div className="text-2xl font-bold text-gray-900">{totalCompleted}</div>
          <div className="text-xs text-gray-500">
            items in {data.length} {data.length === 1 ? 'week' : 'weeks'}
          </div>
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

      {data.length === 0 && (
        <div role="status" className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center text-gray-600">
          No completed items in the selected period.
        </div>
      )}

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
                  fill={getThroughputBarColor(entry.count, stats)}
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
