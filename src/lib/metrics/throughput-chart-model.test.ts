import type { ProcessedFlowIssue } from '../flow/flow-types';
import {
  buildThroughputChartModel,
  calculateThroughputStatistics,
  calculateWeeklyThroughput,
  getWeekStart,
} from './throughput-chart-model';

const now = new Date(2024, 0, 31, 12);

function completedIssue(key: string, done: Date): ProcessedFlowIssue {
  return { key, done } as ProcessedFlowIssue;
}

describe('throughput chart model', () => {
  it('uses Monday as the week boundary, including for Sunday', () => {
    expect(getWeekStart(new Date(2024, 0, 7, 18))).toEqual(new Date(2024, 0, 1));
    expect(getWeekStart(new Date(2024, 0, 8, 18))).toEqual(new Date(2024, 0, 8));
  });

  it('groups completed issues and inserts empty weeks between activity', () => {
    const weeks = calculateWeeklyThroughput([
      completedIssue('OLD', new Date(2023, 11, 1)),
      completedIssue('FLOW-1', new Date(2024, 0, 8, 9)),
      completedIssue('FLOW-2', new Date(2024, 0, 9, 9)),
      completedIssue('FLOW-3', new Date(2024, 0, 22, 9)),
      { key: 'OPEN' } as ProcessedFlowIssue,
    ], 30, now);

    expect(weeks.map(week => ({
      start: week.startDate,
      count: week.count,
      issues: week.issues,
    }))).toEqual([
      { start: new Date(2024, 0, 8), count: 2, issues: ['FLOW-1', 'FLOW-2'] },
      { start: new Date(2024, 0, 15), count: 0, issues: [] },
      { start: new Date(2024, 0, 22), count: 1, issues: ['FLOW-3'] },
    ]);
  });

  it('includes completions throughout the current day and excludes later dates', () => {
    const weeks = calculateWeeklyThroughput([
      completedIssue('TODAY', new Date(2024, 0, 31, 23, 30)),
      completedIssue('TOMORROW', new Date(2024, 1, 1, 0, 0)),
    ], 7, now);

    expect(weeks.flatMap(week => week.issues)).toEqual(['TODAY']);
  });

  it('calculates average, median, and population deviation without changing input order', () => {
    const weeks = [3, 0, 1, 2].map((count, index) => ({
      label: '', count, startDate: new Date(2024, 0, index + 1), endDate: new Date(), issues: [],
    }));

    expect(calculateThroughputStatistics(weeks)).toEqual({
      avg: 1.5,
      median: 1.5,
      stdDev: Math.sqrt(1.25),
    });
    expect(weeks.map(week => week.count)).toEqual([3, 0, 1, 2]);
  });

  it('builds a zero summary for no completed work', () => {
    expect(buildThroughputChartModel([], 30, now)).toEqual({
      weeks: [],
      statistics: { avg: 0, median: 0, stdDev: 0 },
      totalCompleted: 0,
    });
  });
});
