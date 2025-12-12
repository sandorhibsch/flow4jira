"use client";

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid, ResponsiveContainer } from 'recharts';
import { ProcessedFlowIssue } from '@/lib/flow/flow-types';
import { useMonteCarloWhen } from '@/lib/metrics/mc-when-simulator';

export function MonteCarloWhenChart({
  issues,
  periodDays = 60
}: {
  issues: ProcessedFlowIssue[];
  periodDays?: number;
}) {
  const [targetItems, setTargetItems] = useState(issues.length);

  useEffect(() => {
    setTargetItems(issues.length);
  }, [issues.length]);

  const { distribution, p50, p85, p95 } =
    useMonteCarloWhen(issues, periodDays, targetItems);

  const counts: Record<number, number> = {};
  distribution.forEach(v => counts[v] = (counts[v] ?? 0) + 1);
  const data = Object.entries(counts).map(([d, f]) => ({
    days: Number(d), frequency: f
  }));

  return (
    <div style={{ width: '100%', padding: 20 }}>
      <p className="text-sm font-bold text-gray-900 mb-1">Forecast for {targetItems} items</p>

      <input
        type="range"
        min={1}
        max={issues.length}
        value={targetItems}
        onChange={e => setTargetItems(Number(e.target.value))}
        style={{ width: '100%', marginBottom: 16 }}
      />
      <div className="flex flex-row">
        <div className="gap-4 mb-6 mt-6">
          <div className="bg-white p-4 mb-4 rounded-lg shadow max-h-24 gap-4">
            <div className="text-sm text-grey-800">50% certainty</div>
            <div className="text-lg font-bold text-orange-500">{p50} days</div>
          </div>

          <div className="bg-white p-4 mb-4 rounded-lg shadow max-h-24 gap-4">
            <div className="text-sm text-grey-800">85% certainty</div>
            <div className="text-lg font-bold text-green-500">{p85} days</div>
          </div>

          <div className="bg-white p-4 mb-4 rounded-lg shadow max-h-24 gap-4">
            <div className="text-sm text-grey-800">95% certainty</div>
            <div className="text-lg font-bold text-blue-500">{p95} days</div>
          </div>
        </div>
        <ResponsiveContainer width="100%" aspect={2}>
          <BarChart width={800} height={320} data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="days" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="frequency" fill="#92c4ff" />

            <ReferenceLine x={p50} stroke="darkorange" label={{
              value: `50% certainty: ${p50} days`,
              position: 'insideLeft',
              fill: "darkorange",
              fontWeight: "bold",
              fontSize: "0.875rem"
            }} />
            <ReferenceLine x={p85} stroke="green" label={{
              value: `85% certainty: ${p85} days`,
              position: 'insideTopLeft',
              fill: "green",
              fontWeight: "bold",
              fontSize: "0.875rem"
            }} />
            <ReferenceLine x={p95} stroke="blue" label={{
              value: `95% certainty: ${p95} days`,
              position: 'insideTop',
              offset: 25,
              fill: "blue",
              fontWeight: "bold",
              fontSize: "0.875rem"
            }} />
          </BarChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}
