import { simulateHowMany, simulateWhen } from './monte-carlo';

function sequenceRandom(values: number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length] ?? 0;
}

describe('simulateHowMany', () => {
  it('samples daily throughput and reports pessimistic delivery confidence', () => {
    const result = simulateHowMany([0, 2], 2, 4, sequenceRandom([0, 0, 0, 0.9, 0.9, 0, 0.9, 0.9]));

    expect(result.distribution).toEqual([0, 2, 2, 4]);
    expect(result).toMatchObject({ p50: 2, p85: 0, p95: 0 });
  });

  it.each([
    [[], 5, 10],
    [[1], -1, 10],
    [[1], 5, 0],
  ])('returns no forecast for invalid sampling inputs %#', (throughput, days, simulations) => {
    expect(simulateHowMany(throughput, days, simulations)).toEqual({
      distribution: [], p50: 0, p85: 0, p95: 0,
    });
  });

  it('preserves distribution invariants across varied samples', () => {
    const result = simulateHowMany([0, 1, 3], 7, 50, sequenceRandom([0, 0.4, 0.9]));

    expect(result.distribution).toHaveLength(50);
    expect(result.distribution).toEqual([...result.distribution].sort((a, b) => a - b));
    expect(result.distribution.every((value) => value >= 0 && value <= 21)).toBe(true);
    expect(result.p95).toBeLessThanOrEqual(result.p85);
    expect(result.p85).toBeLessThanOrEqual(result.p50);
  });
});

describe('simulateWhen', () => {
  it('samples days to completion and reports upper confidence percentiles', () => {
    const result = simulateWhen([1, 2], 3, 4, sequenceRandom([0, 0, 0.9, 0.9, 0, 0.9]));

    expect(result.distribution).toEqual([2, 2, 2, 3]);
    expect(result).toMatchObject({ p50: 2, p85: 3, p95: 3 });
  });

  it.each([
    [[], 1, 10],
    [[0, 0], 1, 10],
    [[1], 0, 10],
    [[1], 1, 0],
  ])('returns no forecast when completion cannot be sampled %#', (throughput, target, simulations) => {
    expect(simulateWhen(throughput, target, simulations)).toEqual({
      distribution: [], p50: 0, p85: 0, p95: 0,
    });
  });

  it('caps every simulation at the configured safety limit', () => {
    const result = simulateWhen([0, 1], 100, 25, () => 0, 30);

    expect(result.distribution).toEqual(Array(25).fill(30));
    expect(result.p50).toBe(30);
    expect(result.p85).toBe(30);
    expect(result.p95).toBe(30);
  });

  it('preserves percentile ordering for varied samples', () => {
    const result = simulateWhen([0, 1, 3], 10, 50, sequenceRandom([0, 0.4, 0.9]));

    expect(result.distribution).toHaveLength(50);
    expect(result.distribution).toEqual([...result.distribution].sort((a, b) => a - b));
    expect(result.distribution.every((days) => days >= 1 && days <= 730)).toBe(true);
    expect(result.p50).toBeLessThanOrEqual(result.p85);
    expect(result.p85).toBeLessThanOrEqual(result.p95);
  });
});
