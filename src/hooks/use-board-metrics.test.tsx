/** @jest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react';
import { useBoardMetrics } from './use-board-metrics';
import { getBoardMetricsService } from '@/lib/browser/board-metrics-service-factory';
import type { BoardConfig } from '@/lib/repositories/board-config.types';
import type { BoardMetricsOperations } from '@/lib/services/board-metrics.contracts';

jest.mock('@/lib/browser/board-metrics-service-factory', () => ({
  getBoardMetricsService: jest.fn()
}));

const board: BoardConfig = {
  metadata: { boardId: '42', periodDays: 30, updatedAt: new Date('2026-10-18') },
  workflow: { key: 'delivery', name: 'Delivery', stages: [] }
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function renderLoadedBoard(refresh: BoardMetricsOperations['refresh']) {
  jest.mocked(getBoardMetricsService).mockReturnValue({
    load: async () => ({ success: true, data: board }),
    refresh
  });
  const { result } = renderHook(() => useBoardMetrics('42'));
  await waitFor(() => expect(result.current.board).toEqual(board));
  return result;
}

describe('useBoardMetrics', () => {
  it('ignores a second refresh while the first is pending', async () => {
    const refreshResult = deferred<Awaited<ReturnType<BoardMetricsOperations['refresh']>>>();
    const refresh = jest.fn(() => refreshResult.promise);
    const result = await renderLoadedBoard(refresh);
    act(() => {
      void result.current.refresh(60);
      void result.current.refresh(90);
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    await act(async () => {
      refreshResult.resolve({ success: true, data: board });
    });
  });

  it('keeps the current board pending until the saved board arrives', async () => {
    const saved = { ...board, metadata: { ...board.metadata, periodDays: 60 } };
    const refreshResult = deferred<Awaited<ReturnType<BoardMetricsOperations['refresh']>>>();
    const result = await renderLoadedBoard(() => refreshResult.promise);
    let refreshing!: Promise<void>;
    act(() => {
      refreshing = result.current.refresh(60);
    });
    expect(result.current.pending).toBe('refresh');
    expect(result.current.board).toEqual(board);
    await act(async () => {
      refreshResult.resolve({ success: true, data: saved });
      await refreshing;
    });
    expect(result.current.pending).toBeNull();
    expect(result.current.board).toEqual(saved);
  });

  it('retains the previous board on a failed refresh', async () => {
    const result = await renderLoadedBoard(async () => ({
      success: false,
      kind: 'persistence',
      error: 'Quota exceeded'
    }));
    await act(() => result.current.refresh(60));
    expect(result.current.board).toEqual(board);
    expect(result.current.error).toBe('Quota exceeded');
  });

  it('clears the previous error on a successful retry', async () => {
    const refresh = jest
      .fn<
        ReturnType<BoardMetricsOperations['refresh']>,
        Parameters<BoardMetricsOperations['refresh']>
      >()
      .mockResolvedValueOnce({ success: false, kind: 'persistence', error: 'Quota exceeded' })
      .mockResolvedValueOnce({ success: true, data: board });
    const result = await renderLoadedBoard(refresh);
    await act(() => result.current.refresh(60));
    expect(result.current.error).toBe('Quota exceeded');
    await act(() => result.current.refresh(60));
    expect(result.current.error).toBeNull();
  });

  it('ignores an old board load that completes after navigation', async () => {
    const oldLoad = deferred<Awaited<ReturnType<BoardMetricsOperations['load']>>>();
    const nextBoard = { ...board, metadata: { ...board.metadata, boardId: '99' } };
    const operations: BoardMetricsOperations = {
      load: (id) =>
        id === '42' ? oldLoad.promise : Promise.resolve({ success: true, data: nextBoard }),
      refresh: async () => ({ success: true, data: board })
    };
    jest.mocked(getBoardMetricsService).mockReturnValue(operations);
    const { result, rerender } = renderHook(({ id }) => useBoardMetrics(id), {
      initialProps: { id: '42' }
    });
    rerender({ id: '99' });
    await waitFor(() => expect(result.current.board).toEqual(nextBoard));
    await act(async () => {
      oldLoad.resolve({ success: true, data: board });
    });
    expect(result.current.board).toEqual(nextBoard);
  });

  it('ignores an old refresh after navigation', async () => {
    const oldRefresh = deferred<Awaited<ReturnType<BoardMetricsOperations['refresh']>>>();
    const operations: BoardMetricsOperations = {
      load: async (id) => ({
        success: true,
        data: { ...board, metadata: { ...board.metadata, boardId: id } }
      }),
      refresh: () => oldRefresh.promise
    };
    jest.mocked(getBoardMetricsService).mockReturnValue(operations);
    const { result, rerender } = renderHook(({ id }) => useBoardMetrics(id), {
      initialProps: { id: '42' }
    });
    await waitFor(() => expect(result.current.pending).toBeNull());
    let refreshing!: Promise<void>;
    act(() => {
      refreshing = result.current.refresh(60);
    });
    rerender({ id: '99' });
    await waitFor(() => expect(result.current.board?.metadata.boardId).toBe('99'));
    await act(async () => {
      oldRefresh.resolve({ success: true, data: board });
      await refreshing;
    });
    expect(result.current.board?.metadata.boardId).toBe('99');
  });
});
