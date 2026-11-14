import type { JiraIssue } from '@/lib/jira/jira-types';
import type { BoardConfig, RepositoryResult } from '@/lib/repositories/board-config.types';

export interface JiraIssueSource {
  fetchIssues(query: {
    boardId: string;
    periodDays: number;
  }): Promise<RepositoryResult<JiraIssue[]>>;
}

/** Expected operational failures are returned as results, including adapter exceptions. */
export type RefreshBoardMetricsResult =
  | { success: true; data: BoardConfig }
  | {
    success: false;
    kind: 'configuration' | 'fetch' | 'processing' | 'persistence';
    error: string;
  };

export interface BoardMetricsOperations {
  load(boardId: string): Promise<RepositoryResult<BoardConfig | null>>;
  refresh(board: BoardConfig, periodDays: number): Promise<RefreshBoardMetricsResult>;
}
