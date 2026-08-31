/** @jest-environment jsdom */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useParams, useRouter } from 'next/navigation';
import { getBoardConfigClient, isServerPersistenceMode } from '@/lib/repositories/client/board-config-client-factory';
import type { BoardConfig } from '@/lib/repositories/board-config.types';
import ConfigurePage from './page';

jest.mock('next/navigation', () => ({ useParams: jest.fn(), useRouter: jest.fn() }));
jest.mock('@/lib/repositories/client/board-config-client-factory', () => ({
  getBoardConfigClient: jest.fn(),
  isServerPersistenceMode: jest.fn(),
}));

const boardConfig: BoardConfig = {
  metadata: {
    boardId: '42', boardName: 'Delivery', boardType: 'kanban', periodDays: 30,
    updatedAt: new Date('2026-08-31T10:00:00.000Z'),
  },
  workflow: {
    key: 'board-42',
    name: 'Delivery Workflow',
    stages: [
      {
        key: 'doing', name: 'Doing', jiraStatuses: ['In Progress'],
        stageType: 'in-progress', isCycleStart: true, color: '#4e79a7',
      },
      {
        key: 'done', name: 'Done', jiraStatuses: ['Done'],
        stageType: 'done', isCycleEnd: true, color: '#59a14f',
      },
    ],
  },
  processedIssues: [],
};

const repository = {
  findByBoardId: jest.fn(),
  save: jest.fn(),
};

describe('workflow configuration page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useParams).mockReturnValue({});
    jest.mocked(useRouter).mockReturnValue({ push: jest.fn() } as never);
    jest.mocked(getBoardConfigClient).mockReturnValue(repository as never);
    jest.mocked(isServerPersistenceMode).mockReturnValue(false);
    repository.findByBoardId.mockResolvedValue({ success: true, data: boardConfig });
    repository.save.mockResolvedValue({ success: true, data: boardConfig });
  });

  it('lets the user assign and remove a Jira status', async () => {
    const user = userEvent.setup();
    await loadExistingBoard(user);
    const statusInput = screen.getAllByPlaceholderText("Enter status name (e.g., 'In Progress')")[0]!;

    await user.type(statusInput, 'Review');
    await user.click(screen.getAllByRole('button', { name: 'Add' })[0]!);
    const statusBadge = screen.getByText('Review').closest('span');
    expect(statusBadge).not.toBeNull();

    await user.click(within(statusBadge!).getByRole('button', { name: '×' }));
    expect(screen.queryByText('Review')).not.toBeInTheDocument();
  });

  it('prevents saving an invalid workflow and explains why', async () => {
    const user = userEvent.setup();
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation();
    await loadExistingBoard(user);

    await user.click(screen.getAllByLabelText('Cycle Start')[0]!);
    await user.click(screen.getByRole('button', { name: 'Save Workflow Configuration' }));

    expect(alertSpy).toHaveBeenCalledWith('At least one stage must be marked as cycle start');
    expect(repository.save).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('saves a valid workflow assembled from the editor state', async () => {
    const user = userEvent.setup();
    await loadExistingBoard(user);

    await user.click(screen.getByRole('button', { name: 'Save Workflow Configuration' }));

    await waitFor(() => expect(repository.save).toHaveBeenCalledWith({
      boardId: '42',
      boardName: 'Delivery',
      boardType: 'kanban',
      periodDays: 30,
      workflow: boardConfig.workflow,
    }));
    expect(screen.getByText('Configuration saved successfully!')).toBeInTheDocument();
  });
});

async function loadExistingBoard(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  render(<ConfigurePage />);
  await user.type(screen.getByPlaceholderText('Enter Jira Board ID (e.g., 123)'), '42');
  await user.click(screen.getByRole('button', { name: 'Load Board' }));
  await screen.findByText('Loaded existing configuration');
}
