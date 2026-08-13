import { createMockProcessedIssue } from '../testutils/create-mocks';
import { calculateThroughput } from './calculate-throughput';

describe('calculateThroughput', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2025, 0, 10, 12));
  });

  afterEach(() => jest.useRealTimers());

  it('returns one bucket per day from oldest to newest', () => {
    const issues = [
      createMockProcessedIssue({ key: 'today-a', done: new Date(2025, 0, 10, 0, 1) }),
      createMockProcessedIssue({ key: 'today-b', done: new Date(2025, 0, 10, 23, 59) }),
      createMockProcessedIssue({ key: 'yesterday', done: new Date(2025, 0, 9, 12) }),
      createMockProcessedIssue({ key: 'oldest', done: new Date(2025, 0, 8, 12) }),
    ];

    expect(calculateThroughput(issues, 3)).toEqual([1, 1, 2]);
  });

  it('excludes unfinished, future, and boundary-old issues', () => {
    const issues = [
      createMockProcessedIssue({ key: 'unfinished', done: undefined }),
      createMockProcessedIssue({ key: 'future', done: new Date(2025, 0, 11, 12) }),
      createMockProcessedIssue({ key: 'outside', done: new Date(2025, 0, 7, 12) }),
      createMockProcessedIssue({ key: 'inside', done: new Date(2025, 0, 8, 12) }),
    ];

    expect(calculateThroughput(issues, 3)).toEqual([1, 0, 0]);
  });

  it('returns an empty sample for a zero-day observation period', () => {
    expect(calculateThroughput([createMockProcessedIssue()], 0)).toEqual([]);
  });

  it('counts each eligible issue exactly once', () => {
    const issues = Array.from({ length: 20 }, (_, index) =>
      createMockProcessedIssue({
        key: `issue-${index}`,
        done: new Date(2025, 0, 10 - (index % 5), 12),
      })
    );

    const throughput = calculateThroughput(issues, 5);

    expect(throughput).toHaveLength(5);
    expect(throughput.every((count) => count >= 0 && Number.isInteger(count))).toBe(true);
    expect(throughput.reduce((sum, count) => sum + count, 0)).toBe(issues.length);
  });
});
