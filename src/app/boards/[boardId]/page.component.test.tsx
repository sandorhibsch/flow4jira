/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useParams, useRouter } from 'next/navigation';
import { getBoardMetricsService } from '@/lib/browser/board-metrics-service-factory';
import type { BoardConfig } from '@/lib/repositories/board-config.types';
import BoardMetricsPage from './page';

jest.mock('next/navigation', () => ({ useParams: jest.fn(), useRouter: jest.fn() }));
jest.mock('@/lib/browser/board-metrics-service-factory', () => ({
  getBoardMetricsService: jest.fn()
}));
jest.mock(
  '@/ui/aging-scatterplot',
  () =>
    function AgingScatterplotMock() {
      return <div>Aging results</div>;
    }
);
jest.mock(
  '@/ui/cumulative-flow-diagram',
  () =>
    function CumulativeFlowDiagramMock() {
      return <div>CFD results</div>;
    }
);
jest.mock(
  '@/ui/cycletime-scatterplot',
  () =>
    function CycleTimeScatterplotMock() {
      return <div>Cycle time results</div>;
    }
);
jest.mock(
  '@/ui/flow-issue-table',
  () =>
    function FlowIssueTableMock() {
      return <div>Issue results</div>;
    }
);
jest.mock('@/ui/montecarlo-howmany', () => ({
  MonteCarloHowManyChart: function MonteCarloHowManyChartMock() {
    return <div>How many results</div>;
  }
}));
jest.mock('@/ui/montecarlo-when', () => ({
  MonteCarloWhenChart: function MonteCarloWhenChartMock() {
    return <div>When results</div>;
  }
}));
jest.mock(
  '@/ui/throughput-histogram',
  () =>
    function ThroughputHistogramMock() {
      return <div>Throughput results</div>;
    }
);

const board: BoardConfig = {
  metadata: {
    boardId: '42',
    boardName: 'Delivery',
    periodDays: 30,
    updatedAt: new Date('2026-10-18')
  },
  workflow: { key: 'delivery', name: 'Delivery', stages: [] },
  processedIssues: []
};
const operations = { load: jest.fn(), refresh: jest.fn() };
const populatedBoard = { ...board, processedIssues: [{ key: 'DEL-1' }] };
const push = jest.fn();

describe('BoardMetricsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useParams).mockReturnValue({ boardId: '42' });
    jest.mocked(useRouter).mockReturnValue({ push } as never);
    jest.mocked(getBoardMetricsService).mockReturnValue(operations);
    operations.load.mockResolvedValue({ success: true, data: board });
    operations.refresh.mockResolvedValue({
      success: true,
      data: populatedBoard
    });
  });

  it('offers configuration for a missing board', async () => {
    operations.load.mockResolvedValue({ success: true, data: null });
    render(<BoardMetricsPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Configure Board' }));
    expect(push).toHaveBeenCalledWith('/boards/42/configure');
  });

  it('shows load failures instead of treating them as missing configuration', async () => {
    operations.load.mockResolvedValue({ success: false, error: 'Storage unavailable' });
    render(<BoardMetricsPage />);
    expect(await screen.findByText('Storage unavailable')).toBeInTheDocument();
    expect(screen.queryByText('No Configuration Found')).not.toBeInTheDocument();
  });

  it('shows refresh failure reasons and re-enables loading', async () => {
    operations.refresh.mockResolvedValue({
      success: false,
      kind: 'fetch',
      error: 'Jira unavailable'
    });
    render(<BoardMetricsPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Load issues' }));
    expect(await screen.findByText('Jira unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Load issues' })).toBeEnabled();
  });

  it('disables refresh when the period is empty', async () => {
    render(<BoardMetricsPage />);
    await userEvent.clear(await screen.findByRole('spinbutton'));
    expect(screen.getByRole('button', { name: 'Load issues' })).toBeDisabled();
  });

  it('submits the selected period', async () => {
    const user = userEvent.setup();
    render(<BoardMetricsPage />);
    const period = await screen.findByRole('spinbutton');
    await user.clear(period);
    await user.type(period, '60');
    await user.click(screen.getByRole('button', { name: 'Load issues' }));
    expect(operations.refresh).toHaveBeenCalledWith(board, 60);
  });

  it('displays results returned by refresh', async () => {
    render(<BoardMetricsPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Load issues' }));
    expect(await screen.findByText('Aging Chart')).toBeInTheDocument();
    expect(screen.queryByText('Ready to Analyze')).not.toBeInTheDocument();
  });

  it('replaces visible results with the empty state after an empty refresh', async () => {
    operations.load.mockResolvedValue({ success: true, data: populatedBoard });
    operations.refresh.mockResolvedValue({ success: true, data: board });
    render(<BoardMetricsPage />);
    expect(await screen.findByText('Aging Chart')).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: 'Load issues' }));
    expect(await screen.findByText('Ready to Analyze')).toBeInTheDocument();
    expect(screen.queryByText('Aging Chart')).not.toBeInTheDocument();
  });
});
