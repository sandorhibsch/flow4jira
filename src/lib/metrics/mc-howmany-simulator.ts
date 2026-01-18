import { useMemo } from 'react';
import type { ProcessedFlowIssue } from '../flow/flow-types';

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

    // Guard against empty throughput array
    if (throughput.length === 0) {
      return { distribution: [], p50: 0, p85: 0, p95: 0 };
    }

    const results: number[] = [];
    for (let i = 0; i < simulations; i++) {
      let delivered = 0;
      for (let d = 0; d < forecastRangeDays; d++) {
        const randomIndex = Math.floor(Math.random() * throughput.length);
        delivered += throughput[randomIndex] ?? 0;
      }
      results.push(delivered);
    }

    results.sort((a, b) => a - b);

    const p = (pct: number) =>
      results[Math.floor(pct * results.length)] ?? 0;

    // Note: For "how many can we deliver", lower percentiles = pessimistic
    // p85 means "85% chance we deliver AT LEAST this many"
    return {
      distribution: results,
      p50: p(0.50),
      p85: p(0.15),  // 85% confidence = 15th percentile (pessimistic)
      p95: p(0.05)   // 95% confidence = 5th percentile (very pessimistic)
    };
  }, [issues, periodDays, forecastRangeDays, simulations]);
}
