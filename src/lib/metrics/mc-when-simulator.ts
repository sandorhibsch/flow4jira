import { useMemo } from 'react';
import type { ProcessedFlowIssue } from '../flow/flow-types';
import { calculateThroughput } from './calculate-throughput';

export function useMonteCarloWhen(
  issues: ProcessedFlowIssue[],
  periodDays: number,
  targetItems: number,
  simulations = 10000
) {
  return useMemo(() => {
    if (issues.length === 0 || targetItems <= 0) {
      return { distribution: [], p50: 0, p85: 0, p95: 0 };
    }

    const throughput = calculateThroughput(issues, periodDays);
    
    // Guard against empty throughput or all-zero values (would cause infinite loop)
    if (throughput.length === 0) {
      return { distribution: [], p50: 0, p85: 0, p95: 0 };
    }
    
    const hasPositiveThroughput = throughput.some(t => t > 0);
    if (!hasPositiveThroughput) {
      return { distribution: [], p50: 0, p85: 0, p95: 0 };
    }

    const results: number[] = [];

    for (let i = 0; i < simulations; i++) {
      let remaining = targetItems;
      let days = 0;
      const maxDays = 365 * 2; // Safety limit: 2 years

      while (remaining > 0 && days < maxDays) {
        const randomIndex = Math.floor(Math.random() * throughput.length);
        remaining -= throughput[randomIndex] ?? 0;
        days++;
      }

      results.push(days);
    }

    results.sort((a, b) => a - b);

    const p = (pct: number) => results[Math.floor(pct * results.length)] ?? 0;

    return {
      distribution: results,
      p50: p(0.50),
      p85: p(0.85),
      p95: p(0.95)
    };
  }, [issues, periodDays, targetItems, simulations]);
}
