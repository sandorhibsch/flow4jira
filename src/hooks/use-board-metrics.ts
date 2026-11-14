import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BoardConfig } from '@/lib/repositories/board-config.types';
import { getBoardMetricsService } from '@/lib/browser/board-metrics-service-factory';

interface MetricsState {
  boardId: string;
  board: BoardConfig | null;
  pending: 'load' | 'refresh' | null;
  error: string | null;
}

export function useBoardMetrics(boardId: string) {
  const service = useMemo(getBoardMetricsService, []);
  const boardSession = useRef(0);
  const refreshing = useRef(false);
  const [state, setState] = useState<MetricsState>({
    boardId,
    board: null,
    pending: 'load',
    error: null
  });
  useEffect(() => {
    const session = ++boardSession.current;
    refreshing.current = false;
    setState({ boardId, board: null, pending: 'load', error: null });
    void service.load(boardId).then((result) => {
      // Ignore results from a board the user has left.
      if (boardSession.current !== session) return;
      setState({
        boardId,
        board: result.success ? result.data : null,
        pending: null,
        error: result.success ? null : result.error
      });
    });
    return () => {
      boardSession.current = session + 1;
    };
  }, [boardId, service]);

  const refresh = useCallback(
    async (periodDays: number) => {
      if (!state.board || state.boardId !== boardId || refreshing.current) return;
      const session = boardSession.current;
      refreshing.current = true;
      setState((previous) => ({ ...previous, pending: 'refresh', error: null }));
      const result = await service.refresh(state.board, periodDays);
      if (boardSession.current !== session) return;
      refreshing.current = false;
      setState((previous) => ({
        ...previous,
        pending: null,
        board: result.success ? result.data : previous.board,
        error: result.success ? null : result.error
      }));
    },
    [boardId, service, state.board, state.boardId]
  );
  return {
    ...(state.boardId === boardId
      ? state
      : { boardId, board: null, pending: 'load' as const, error: null }),
    refresh
  };
}
