/** @jest-environment jsdom */
import React from 'react';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { useBoardConfig } from '@/hooks/use-board-config';
import { getBoardConfigClient } from '@/lib/repositories/client/board-config-client-factory';
import type { BoardConfig } from '@/lib/repositories/board-config.types';
import type { WorkflowDefinition } from '@/lib/jira/workflow-config';

jest.mock('@/lib/repositories/client/board-config-client-factory', () => ({
  getBoardConfigClient: jest.fn(),
}));

const mockRepo = {
  findByBoardId: jest.fn(),
  save: jest.fn(),
  listAll: jest.fn(),
  delete: jest.fn(),
};

const TEST_WORKFLOW: WorkflowDefinition = { key: 'delivery', name: 'Delivery', stages: [] };
const mockBoardConfig: BoardConfig = {
  metadata: {
    boardId: '42', boardName: 'Delivery', boardType: 'kanban', periodDays: 30,
    updatedAt: new Date('2026-08-30T12:00:00.000Z'),
  },
  workflow: TEST_WORKFLOW,
  processedIssues: [],
};

(getBoardConfigClient as jest.Mock).mockImplementation(() => mockRepo);

function TestComponent({ boardId }: { boardId: string }) {
  const { isLoading, metadata } = useBoardConfig(boardId);
  return React.createElement('div', null, isLoading ? 'loading' : metadata ? metadata.boardId : 'no');
}

describe('useBoardConfig (UI)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo.findByBoardId.mockResolvedValue({ success: true, data: null });
    (getBoardConfigClient as jest.Mock).mockImplementation(() => mockRepo);
  });

  test('loads config from client repository', async () => {
    mockRepo.findByBoardId.mockResolvedValue({
      success: true,
      data: {
        metadata: { boardId: '6085', boardName: 'B', boardType: 'kanban', periodDays: 30, updatedAt: new Date() },
        workflow: { key: 'k', name: 'n', stages: [] },
        processedIssues: [],
      },
    });

    render(React.createElement(TestComponent, { boardId: '6085' }));

    await waitFor(() => expect(screen.getByText('6085')).toBeInTheDocument());
  });

  test('handles not found (null) response', async () => {
    mockRepo.findByBoardId.mockResolvedValue({ success: true, data: null });

    render(React.createElement(TestComponent, { boardId: '9999' }));

    await waitFor(() => expect(screen.getByText('no')).toBeInTheDocument());
  });

  test('does not load without a board ID', async () => {
    const { result } = renderHook(() => useBoardConfig(undefined));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockRepo.findByBoardId).not.toHaveBeenCalled();
  });

  test('exposes load failures and can clear the error', async () => {
    mockRepo.findByBoardId.mockResolvedValue({ success: false, error: 'database unavailable' });
    const { result } = renderHook(() => useBoardConfig('42'));

    await waitFor(() => expect(result.current.error).toBe('database unavailable'));
    act(() => result.current.clearError());
    expect(result.current.error).toBeNull();
  });

  test('treats a not-found failure as an empty configuration', async () => {
    mockRepo.findByBoardId.mockResolvedValue({ success: false, error: 'Board not found' });
    const { result } = renderHook(() => useBoardConfig('42'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.config).toBeNull();
  });

  test('saves through the adapter and exposes derived configuration state', async () => {
    mockRepo.save.mockResolvedValue({ success: true, data: mockBoardConfig });
    const { result } = renderHook(() => useBoardConfig('42'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let saved = false;
    await act(async () => {
      saved = await result.current.save(30, TEST_WORKFLOW, 'Delivery', 'kanban', mockBoardConfig.processedIssues);
    });

    expect(saved).toBe(true);
    expect(mockRepo.save).toHaveBeenCalledWith({
      boardId: '42', boardName: 'Delivery', boardType: 'kanban', periodDays: 30,
      workflow: TEST_WORKFLOW, processedIssues: mockBoardConfig.processedIssues,
    });
    expect(result.current.metadata).toBe(mockBoardConfig.metadata);
    expect(result.current.workflow).toBe(TEST_WORKFLOW);
    expect(result.current.processedIssues).toBe(mockBoardConfig.processedIssues);
    expect(result.current.isSaving).toBe(false);
  });

  test('returns false and exposes save failures', async () => {
    mockRepo.save.mockResolvedValue({ success: false, error: 'write failed' });
    const { result } = renderHook(() => useBoardConfig('42'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let saved = true;
    await act(async () => { saved = await result.current.save(30, TEST_WORKFLOW); });

    expect(saved).toBe(false);
    expect(result.current.error).toBe('write failed');
    expect(result.current.isSaving).toBe(false);
  });

  test('rejects save without a board ID before calling the adapter', async () => {
    const { result } = renderHook(() => useBoardConfig(undefined));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let saved = true;
    await act(async () => { saved = await result.current.save(30, TEST_WORKFLOW); });

    expect(saved).toBe(false);
    expect(result.current.error).toBe('Board ID is required');
    expect(mockRepo.save).not.toHaveBeenCalled();
  });

  test('reloads using the stable adapter instance', async () => {
    const { result } = renderHook(() => useBoardConfig('42'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    mockRepo.findByBoardId.mockResolvedValueOnce({ success: true, data: mockBoardConfig });

    await act(async () => { await result.current.reload(); });

    expect(mockRepo.findByBoardId).toHaveBeenCalledTimes(2);
    expect(result.current.config).toBe(mockBoardConfig);
    expect(getBoardConfigClient).toHaveBeenCalledTimes(1);
  });
});
