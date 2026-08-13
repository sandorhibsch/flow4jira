export type MonteCarloResult = {
  distribution: number[];
  p50: number;
  p85: number;
  p95: number;
};

const EMPTY_RESULT: MonteCarloResult = { distribution: [], p50: 0, p85: 0, p95: 0 };

function valueAtPercentile(sorted: number[], percentile: number): number {
  return sorted[Math.floor(percentile * sorted.length)] ?? 0;
}

function sample(throughput: number[], random: () => number): number {
  return throughput[Math.floor(random() * throughput.length)] ?? 0;
}

export function simulateHowMany(
  throughput: number[],
  forecastDays: number,
  simulations: number,
  random: () => number = Math.random
): MonteCarloResult {
  if (throughput.length === 0 || forecastDays < 0 || simulations <= 0) return EMPTY_RESULT;

  const distribution = Array.from({ length: simulations }, () => {
    let delivered = 0;
    for (let day = 0; day < forecastDays; day++) delivered += sample(throughput, random);
    return delivered;
  }).sort((a, b) => a - b);

  return {
    distribution,
    p50: valueAtPercentile(distribution, 0.5),
    p85: valueAtPercentile(distribution, 0.15),
    p95: valueAtPercentile(distribution, 0.05),
  };
}

export function simulateWhen(
  throughput: number[],
  targetItems: number,
  simulations: number,
  random: () => number = Math.random,
  maxDays = 365 * 2
): MonteCarloResult {
  if (
    throughput.length === 0 ||
    !throughput.some((value) => value > 0) ||
    targetItems <= 0 ||
    simulations <= 0 ||
    maxDays <= 0
  ) {
    return EMPTY_RESULT;
  }

  const distribution = Array.from({ length: simulations }, () => {
    let remaining = targetItems;
    let days = 0;
    while (remaining > 0 && days < maxDays) {
      remaining -= sample(throughput, random);
      days++;
    }
    return days;
  }).sort((a, b) => a - b);

  return {
    distribution,
    p50: valueAtPercentile(distribution, 0.5),
    p85: valueAtPercentile(distribution, 0.85),
    p95: valueAtPercentile(distribution, 0.95),
  };
}
