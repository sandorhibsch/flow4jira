'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid, ResponsiveContainer } from 'recharts';
import type { ProcessedFlowIssue } from '@/lib/flow/flow-types';
import { useMonteCarloHowMany } from '@/lib/metrics/mc-howmany-simulator';

export function MonteCarloHowManyChart({
  issues,
  periodDays = 60
}: {
  issues: ProcessedFlowIssue[];
  periodDays?: number;
}) {
  const [forecastDays, setForecastDays] = useState(periodDays);

  useEffect(() => {
    setForecastDays(periodDays);
  }, [periodDays]);

  const { distribution, p50, p85, p95 } =
    useMonteCarloHowMany(issues, periodDays, forecastDays);

  // bucket frequencies for histogram
  const counts: Record<number, number> = {};
  distribution.forEach(v => counts[v] = (counts[v] ?? 0) + 1);

  const data = Object.entries(counts).map(([k, v]) => ({
    value: Number(k),
    frequency: v
  }));

  return (
    <div style={{ width: '100%', padding: 20 }}>
      <p className="text-sm font-bold text-gray-900 mb-1">Forecast horizon: {forecastDays} days</p>

      <input
        type="range"
        min={5}
        max={periodDays}
        step={1}
        value={forecastDays}
        onChange={e => setForecastDays(Number(e.target.value))}
        style={{ width: '100%', marginBottom: 16, overflow: "hidden", backgroundColor: "#82ca9d" }}
      />

      <div className="flex flex-row">
        <div className="gap-4 mb-6 mt-6">
          <div className="bg-white p-4 mb-4 rounded-lg shadow max-h-24 gap-4">
            <div className="text-sm text-grey-800">50% certainty</div>
            <div className="text-lg font-bold text-orange-500">{p50} items</div>
          </div>

          <div className="bg-white p-4 mb-4 rounded-lg shadow max-h-24 gap-4">
            <div className="text-sm text-grey-800">85% certainty</div>
            <div className="text-lg font-bold text-green-500">{p85} items</div>
          </div>

          <div className="bg-white p-4 mb-4 rounded-lg shadow max-h-24 gap-4">
            <div className="text-sm text-grey-800">95% certainty</div>
            <div className="text-lg font-bold text-blue-500">{p95} items</div>
          </div>
        </div>


        <ResponsiveContainer width="100%" aspect={2}>

          <BarChart width={800} height={320} data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="value" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="frequency" fill="#82ca9d" />

            <ReferenceLine x={p50} stroke="darkorange" label={{
              value: `50% certainty: ${p50} items`,
              position: 'insideLeft',
              fill: "darkorange",
              fontWeight: "bold",
              fontSize: "0.875rem"
            }} />
            <ReferenceLine x={p85} stroke="green" label={{
              value: `85% certainty: ${p85} items`,
              position: 'insideTopLeft',
              fill: "green",
              fontWeight: "bold",
              fontSize: "0.875rem"
            }} />
            <ReferenceLine x={p95} stroke="blue" label={{
              value: `95% certainty: ${p95} items`,
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
