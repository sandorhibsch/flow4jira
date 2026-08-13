import { useMemo } from 'react';
import type { ProcessedFlowIssue } from '../flow/flow-types';
import { calculateThroughput } from './calculate-throughput';
import { simulateWhen } from './monte-carlo';

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

    return simulateWhen(calculateThroughput(issues, periodDays), targetItems, simulations);
  }, [issues, periodDays, targetItems, simulations]);
}
