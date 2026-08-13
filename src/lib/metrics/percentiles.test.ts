import { calculatePercentiles } from './percentiles';

describe('calculatePercentiles', () => {
  it('returns no percentiles for an empty sample', () => {
    expect(calculatePercentiles([])).toEqual({});
  });

  it('returns the only observation at every percentile', () => {
    expect(calculatePercentiles([7])).toEqual({ 50: 7, 85: 7, 95: 7 });
  });

  it('sorts observations without mutating the input', () => {
    const cycleTimes = [9, 1, 5];

    expect(calculatePercentiles(cycleTimes, [0, 50, 100])).toEqual({ 0: 1, 50: 5, 100: 9 });
    expect(cycleTimes).toEqual([9, 1, 5]);
  });

  it('linearly interpolates between neighboring cycle times', () => {
    const cycleTimes = [1, 3, 8, 10];

    expect(calculatePercentiles(cycleTimes)).toEqual({
      50: 5.5,
      85: 9.1,
      95: 9.7,
    });
  });

  it.each([-1, 101])('rejects an out-of-range percentile: %s', (percentile) => {
    expect(() => calculatePercentiles([1, 2], [percentile])).toThrow(RangeError);
  });

  it('keeps percentile results monotonic for any ordered request', () => {
    const result = calculatePercentiles([13, 2, 21, 5, 8, 3], [5, 25, 50, 75, 95]);

    expect([result[5], result[25], result[50], result[75], result[95]])
      .toEqual([...Object.values(result)].sort((a, b) => a - b));
  });

});
