import { createMockProcessedIssue } from '../testutils/create-mocks';
import { forecastWhen } from './mc-when-simulator';

describe('forecastWhen', () => {
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

    const result = forecastWhen(issues, 2, 3, 3, () => 0.75);

    expect(result.distribution).toEqual([3, 3, 3]);
    expect(result).toMatchObject({ p50: 3, p85: 3, p95: 3 });
  });

  it.each([
    [[], 30, 10],
    [[createMockProcessedIssue({ done: undefined })], 30, 10],
    [[createMockProcessedIssue({ done: new Date(2025, 0, 10) })], 0, 10],
    [[createMockProcessedIssue({ done: new Date(2025, 0, 10) })], 30, 0],
  ])('returns an empty forecast when historical input cannot support it %#', (issues, periodDays, targetItems) => {
    expect(forecastWhen(issues, periodDays, targetItems, 5, () => 0)).toEqual({
      distribution: [], p50: 0, p85: 0, p95: 0,
    });
  });
});
