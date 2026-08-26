import type { ProcessedFlowIssue } from '../flow/flow-types';
import { calculateThroughput } from './calculate-throughput';
import type { MonteCarloResult } from './monte-carlo';
import { simulateHowMany } from './monte-carlo';

export function forecastHowMany(
  issues: ProcessedFlowIssue[],
  periodDays: number,
  forecastRangeDays: number,
  simulations = 5000,
  random: () => number = Math.random
): MonteCarloResult {
  return simulateHowMany(calculateThroughput(issues, periodDays), forecastRangeDays, simulations, random);
}
