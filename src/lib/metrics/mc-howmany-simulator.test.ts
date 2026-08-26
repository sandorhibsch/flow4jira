import { createMockProcessedIssue } from '../testutils/create-mocks';
import { forecastHowMany } from './mc-howmany-simulator';

describe('forecastHowMany', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2025, 0, 10, 12));
  });

  afterEach(() => jest.useRealTimers());

  it('derives a throughput sample from completed issues before forecasting', () => {
    const issues = [
      createMockProcessedIssue({ done: new Date(2025, 0, 9, 12) }),
      createMockProcessedIssue({ done: new Date(2025, 0, 10, 12) }),
      createMockProcessedIssue({ done: undefined }),
    ];

    const result = forecastHowMany(issues, 2, 3, 4, () => 0.75);

    expect(result.distribution).toEqual([3, 3, 3, 3]);
    expect(result).toMatchObject({ p50: 3, p85: 3, p95: 3 });
  });

  it('returns zero delivery when history contains only zero-throughput days', () => {
    expect(forecastHowMany([], 5, 3, 2, () => 0)).toEqual({
      distribution: [0, 0], p50: 0, p85: 0, p95: 0,
    });
  });

  it.each([
    [0, 3, 5],
    [5, -1, 5],
    [5, 3, 0],
  ])('returns an empty forecast for invalid dimensions %#', (periodDays, forecastDays, simulations) => {
    expect(forecastHowMany([], periodDays, forecastDays, simulations, () => 0)).toEqual({
      distribution: [], p50: 0, p85: 0, p95: 0,
    });
  });
});
