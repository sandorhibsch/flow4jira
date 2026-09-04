import type { ProcessedFlowIssue } from '../flow/flow-types';
import { buildCycleTimeScatterplotModel } from './cycle-time-scatterplot-model';

const now = new Date('2026-08-31T12:00:00.000Z');

function completedIssue(key: string, done: Date, cycleTimeDays: number, issueType = 'Story'): ProcessedFlowIssue {
  return { key, done, cycleTimeDays, issueType } as ProcessedFlowIssue;
}

describe('cycle-time scatterplot model', () => {
  it('filters to the inclusive period range and orders completion points', () => {
    const expectedDateMaxDate = new Date(now);
    const expectedDateMax = expectedDateMaxDate.setHours(23, 59, 59, 999);
    const expectedDateMin = expectedDateMax - 5 * 24 * 60 * 60 * 1000;
    const model = buildCycleTimeScatterplotModel([
      completedIssue('FUTURE', new Date(expectedDateMax + 1), 1),
      completedIssue('LATEST', new Date('2026-08-31T20:00:00.000Z'), 8),
      completedIssue('BOUNDARY', new Date(expectedDateMin), 3),
      completedIssue('OLD', new Date(expectedDateMin - 1), 13),
      { key: 'OPEN' } as ProcessedFlowIssue,
    ], 5, now);

    expect(model.points.map(point => [point.key, point.y])).toEqual([
      ['BOUNDARY', 3],
      ['LATEST', 8],
    ]);
    expect(model.dateMin).toBe(expectedDateMin);
    expect(model.dateMax).toBe(expectedDateMax);
  });

  it('uses the percentile calculator and rounds only presentation values', () => {
    const model = buildCycleTimeScatterplotModel([
      completedIssue('A', new Date('2026-08-29T00:00:00.000Z'), 1),
      completedIssue('B', new Date('2026-08-30T00:00:00.000Z'), 4),
      completedIssue('C', new Date('2026-08-31T00:00:00.000Z'), 10),
    ], 5, now);

    expect(model.percentiles[50]).toBe(4);
    expect(model.percentiles[85]).toBeCloseTo(8.2);
    expect(model.percentiles[95]).toBeCloseTo(9.4);
    expect(model.certaintyDays).toEqual({ 50: 4, 85: 9, 95: 10 });
  });

  it('produces an explicit empty presentation rather than NaN values', () => {
    const model = buildCycleTimeScatterplotModel([], 30, now);

    expect(model.points).toEqual([]);
    expect(model.percentiles).toEqual({});
    expect(model.certaintyDays).toEqual({ 50: null, 85: null, 95: null });
  });

  it('builds a sorted issue-type legend for plotted points only', () => {
    const model = buildCycleTimeScatterplotModel([
      completedIssue('Z', new Date('2026-08-30T00:00:00.000Z'), 2, 'Zebra'),
      completedIssue('S', new Date('2026-08-31T00:00:00.000Z'), 3, 'Story'),
    ], 5, now);

    expect(model.issueTypes).toEqual(['Story', 'Zebra']);
    expect(model.colorMap.get('Story')).toBe('#4e79a7');
    expect(model.colorMap.get('Zebra')).toBeDefined();
  });
});
