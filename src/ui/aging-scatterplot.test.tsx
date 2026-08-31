/** @jest-environment jsdom */

import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { ProcessedFlowIssue } from '@/lib/flow/flow-types';
import type { WorkflowDefinition, WorkflowStage } from '@/lib/jira/workflow-config';
import AgingScatterplot from './aging-scatterplot';

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children?: ReactNode }) => children,
  ScatterChart: ({ children }: { children?: ReactNode }) => children,
  Scatter: ({ children }: { children?: ReactNode }) => children,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  CartesianGrid: () => null,
  Cell: () => null,
}));

const doing: WorkflowStage = { key: 'doing', name: 'Doing', jiraStatuses: [], stageType: 'in-progress' };
const done: WorkflowStage = { key: 'done', name: 'Done', jiraStatuses: [], stageType: 'done' };
const workflow: WorkflowDefinition = { key: 'flow', name: 'Flow', stages: [doing, done] };

function issue(key: string, issueType: string, currentStage = doing): ProcessedFlowIssue {
  return {
    key, issueType, currentStage, summary: key, created: new Date(), flowHistory: [],
    currentStatus: currentStage.name, leadTimeDays: 0, cycleTimeDays: 0, ageDays: 4,
  };
}

describe('AgingScatterplot', () => {
  it('explains when no active issues can be plotted', () => {
    render(<AgingScatterplot issues={[issue('DONE-1', 'Story', done)]} workflow={workflow} />);

    expect(screen.getByRole('status')).toHaveTextContent('No active issues are available for this age view.');
  });

  it('shows the issue types represented by active points', () => {
    render(<AgingScatterplot issues={[issue('A', 'Zebra'), issue('B', 'Story')]} workflow={workflow} />);

    expect(screen.getByText('Story')).toBeInTheDocument();
    expect(screen.getByText('Zebra')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
