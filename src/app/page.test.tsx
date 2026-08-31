/** @jest-environment jsdom */

import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePathname, useRouter } from 'next/navigation';
import { downloadJson, readJsonFile } from '@/lib/browser/json-file';
import { getBoardConfigClient, isServerPersistenceMode } from '@/lib/repositories/client/board-config-client-factory';
import type { BoardConfig } from '@/lib/repositories/board-config.types';
import HomePage from './page';

jest.mock('next/navigation', () => ({ usePathname: jest.fn(), useRouter: jest.fn() }));
jest.mock('@/lib/browser/json-file', () => ({ downloadJson: jest.fn(), readJsonFile: jest.fn() }));
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
    key: 'board-42', name: 'Delivery Workflow',
    stages: [{ key: 'done', name: 'Done', jiraStatuses: ['Done'], stageType: 'done', isCycleEnd: true }],
  },
  processedIssues: [],
};

const repository = {
  listAll: jest.fn(),
  save: jest.fn(),
  findByBoardId: jest.fn(),
  delete: jest.fn(),
};

describe('home page board file workflows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.mocked(usePathname).mockReturnValue('/');
    jest.mocked(useRouter).mockReturnValue({ push: jest.fn(), replace: jest.fn() } as never);
    jest.mocked(getBoardConfigClient).mockReturnValue(repository as never);
    jest.mocked(isServerPersistenceMode).mockReturnValue(true);
    repository.listAll.mockResolvedValue({ success: true, data: [boardConfig.metadata] });
    repository.findByBoardId.mockResolvedValue({ success: true, data: boardConfig });
    repository.save.mockResolvedValue({ success: true, data: boardConfig });
  });

  afterEach(() => {
    act(() => jest.runOnlyPendingTimers());
    jest.useRealTimers();
  });

  it('reports an invalid imported file', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    jest.mocked(readJsonFile).mockRejectedValueOnce(new SyntaxError('Invalid JSON'));
    const { container } = render(<HomePage />);
    await screen.findByText('Delivery');

    await user.upload(fileInput(container), new File(['{'], 'broken.json', { type: 'application/json' }));

    expect(await screen.findByText('Failed to import configuration: Invalid JSON')).toBeInTheDocument();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('imports a valid document and refreshes the board list', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const document = { metadata: boardConfig.metadata, workflow: boardConfig.workflow };
    jest.mocked(readJsonFile).mockResolvedValueOnce(document);
    const { container } = render(<HomePage />);
    await screen.findByText('Delivery');

    await user.upload(fileInput(container), new File(['{}'], 'board.json', { type: 'application/json' }));

    expect(await screen.findByText('Successfully imported board: Delivery')).toBeInTheDocument();
    expect(repository.save).toHaveBeenCalledWith({
      boardId: '42', boardName: 'Delivery', boardType: 'kanban', periodDays: 30,
      workflow: boardConfig.workflow,
    });
    expect(repository.listAll).toHaveBeenCalledTimes(2);
  });

  it('exports the selected board through the browser boundary', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<HomePage />);
    await screen.findByText('Delivery');

    await user.click(screen.getByRole('button', { name: 'Actions' }));
    await user.click(screen.getByRole('button', { name: 'Export' }));

    await waitFor(() => expect(downloadJson).toHaveBeenCalledWith({
      metadata: { ...boardConfig.metadata, updatedAt: '2026-08-31T10:00:00.000Z' },
      workflow: boardConfig.workflow,
    }, 'Delivery-config.json'));
  });
});

function fileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error('Expected board import file input');
  return input;
}
