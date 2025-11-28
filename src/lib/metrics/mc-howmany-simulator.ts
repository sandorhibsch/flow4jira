import { useMemo } from 'react';
import { ProcessedFlowIssue } from '../flow/flow-types';

// from earlier
import { calculateThroughput } from './calculate-throughput';

export function useMonteCarloHowMany(
  issues: ProcessedFlowIssue[],
  periodDays: number,
  forecastRangeDays: number,
  simulations = 5000
) {
  return useMemo(() => {
    const throughput = calculateThroughput(issues, periodDays);

    const results: number[] = [];
    for (let i = 0; i < simulations; i++) {
      let delivered = 0;
      for (let d = 0; d < forecastRangeDays; d++) {
        delivered += throughput[Math.floor(Math.random() * throughput.length)];
      }
      results.push(delivered);
    }

    results.sort((a, b) => a - b);

    const p = (pct: number) =>
      results[Math.floor(pct * results.length)] ?? 0;

    return {
      distribution: results,
      p50: p(0.50),
      p85: p(0.15),
      p95: p(0.05)
    };
  }, [issues, periodDays, forecastRangeDays, simulations]);
}
