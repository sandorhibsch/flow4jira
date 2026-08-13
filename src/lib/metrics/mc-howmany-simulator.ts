import { useMemo } from 'react';
import type { ProcessedFlowIssue } from '../flow/flow-types';

// from earlier
import { calculateThroughput } from './calculate-throughput';
import { simulateHowMany } from './monte-carlo';

export function useMonteCarloHowMany(
  issues: ProcessedFlowIssue[],
  periodDays: number,
  forecastRangeDays: number,
  simulations = 5000
) {
  return useMemo(() => {
    const throughput = calculateThroughput(issues, periodDays);
    return simulateHowMany(throughput, forecastRangeDays, simulations);
  }, [issues, periodDays, forecastRangeDays, simulations]);
}
