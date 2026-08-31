/** @jest-environment jsdom */

import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { ProcessedFlowIssue } from '@/lib/flow/flow-types';
import ThroughputHistogram from './throughput-histogram';

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children?: ReactNode }) => children,
  BarChart: ({ children }: { children?: ReactNode }) => children,
  Bar: ({ children }: { children?: ReactNode }) => children,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  CartesianGrid: () => null,
  ReferenceLine: () => null,
  Cell: () => null,
}));

describe('ThroughputHistogram', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 7, 31, 12));
  });

  afterEach(() => jest.useRealTimers());

  it('explains when the selected period has no completed work', () => {
    render(<ThroughputHistogram issues={[]} periodDays={30} />);

    expect(screen.getByRole('status')).toHaveTextContent('No completed items in the selected period.');
    expect(screen.getByText('items in 0 weeks')).toBeInTheDocument();
  });

  it('presents the summary produced from completed issues', () => {
    const issues = [
      { key: 'FLOW-1', done: new Date(2026, 7, 25) },
      { key: 'FLOW-2', done: new Date(2026, 7, 27) },
    ] as ProcessedFlowIssue[];

    render(<ThroughputHistogram issues={issues} periodDays={30} />);

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('items in 1 week')).toBeInTheDocument();
    expect(screen.getAllByText('2.0')).toHaveLength(2);
    expect(screen.getByText('±0.0')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
