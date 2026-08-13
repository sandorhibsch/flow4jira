export function calculatePercentiles(
  values: number[],
  percentiles: number[] = [50, 85, 95]
): Record<number, number> {
  if (values.length === 0) return {};

  const sorted = [...values].sort((a, b) => a - b);

  return Object.fromEntries(
    percentiles.map((percentile) => {
      if (percentile < 0 || percentile > 100) {
        throw new RangeError(`Percentile must be between 0 and 100: ${percentile}`);
      }

      const rank = (percentile / 100) * (sorted.length - 1) + 1; // 0.5 * 3 + 1 = 2,5
      const floor = Math.floor(rank); // 2
      const fraction = rank - floor;  // 0,5

      const upperIndex = Math.ceil(rank) - 1;
      const lower = sorted[floor - 1]!;
      const upper = sorted[upperIndex]!;


      return [percentile, lower + fraction * (upper - lower)];
    })
  );
}
