/** @jest-environment jsdom */

import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { ProcessedFlowIssue } from '@/lib/flow/flow-types';
import CycleTimeScatterplot from './cycletime-scatterplot';

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children?: ReactNode }) => children,
  ScatterChart: ({ children }: { children?: ReactNode }) => children,
  Scatter: ({ children }: { children?: ReactNode }) => children,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  CartesianGrid: () => null,
  ReferenceLine: () => null,
  Cell: () => null,
}));

function completedIssue(key: string, daysAgo: number, cycleTimeDays: number): ProcessedFlowIssue {
  const done = new Date('2026-08-31T12:00:00.000Z');
  done.setDate(done.getDate() - daysAgo);
  return { key, done, cycleTimeDays, issueType: 'Story' } as ProcessedFlowIssue;
}

describe('CycleTimeScatterplot', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-31T12:00:00.000Z'));
  });

  afterEach(() => jest.useRealTimers());

  it('shows an explicit empty state and no numeric certainty', () => {
    render(<CycleTimeScatterplot issues={[]} periodDays={30} />);

    expect(screen.getByRole('status')).toHaveTextContent('No completed issues are available for the selected period.');
    expect(screen.getAllByText('—')).toHaveLength(3);
  });

  it('updates the displayed period and certainty values after filtering', () => {
    render(<CycleTimeScatterplot
      issues={[completedIssue('OLD', 20, 5), completedIssue('RECENT', 3, 10)]}
      periodDays={30}
    />);

    expect(screen.getByText('8d')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('slider'), { target: { value: '5' } });

    expect(screen.getByText('Analysis period: last 5 days')).toBeInTheDocument();
    expect(screen.getAllByText('10d')).toHaveLength(3);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
