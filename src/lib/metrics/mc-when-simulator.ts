import type { ProcessedFlowIssue } from '../flow/flow-types';
import { calculateThroughput } from './calculate-throughput';
import type { MonteCarloResult } from './monte-carlo';
import { simulateWhen } from './monte-carlo';

export function forecastWhen(
  issues: ProcessedFlowIssue[],
  periodDays: number,
  targetItems: number,
  simulations = 10000,
  random: () => number = Math.random
): MonteCarloResult {
  return simulateWhen(calculateThroughput(issues, periodDays), targetItems, simulations, random);
}
