import type { processJiraIssue } from '@/lib/flow/processor';
import type { BoardConfig, RepositoryResult } from '@/lib/repositories/board-config.types';
import type {
  JiraIssueSource,
  BoardMetricsOperations,
  RefreshBoardMetricsResult
} from './board-metrics.contracts';
import type { IBoardConfigRepository } from '../repositories/board-config.repository';

export class BoardMetricsService implements BoardMetricsOperations {
  constructor(
    private readonly repository: Pick<IBoardConfigRepository, 'findByBoardId' | 'save'>,
    private readonly issues: JiraIssueSource,
    private readonly processIssue: typeof processJiraIssue
  ) { }

  async load(boardId: string): Promise<RepositoryResult<BoardConfig | null>> {
    if (!boardId) return { success: false, error: 'Board ID is required' };
    try {
      return await this.repository.findByBoardId(boardId);
    } catch {
      return { success: false, error: 'Failed to load board configuration' };
    }
  }

  async refresh(board: BoardConfig, periodDays: number): Promise<RefreshBoardMetricsResult> {
    if (
      !board.metadata.boardId ||
      !Number.isInteger(periodDays) ||
      periodDays < 1 ||
      periodDays > 365
    ) {
      return {
        success: false,
        kind: 'configuration',
        error: 'A board ID and analysis period between 1 and 365 days are required'
      };
    }

    let fetched;
    try {
      fetched = await this.issues.fetchIssues({ boardId: board.metadata.boardId, periodDays });
    } catch {
      return { success: false, kind: 'fetch', error: 'Failed to fetch flow metrics' };
    }
    if (!fetched.success) return { ...fetched, kind: 'fetch' };

    let processedIssues;
    try {
      processedIssues = fetched.data.map((issue) =>
        this.processIssue(board.workflow, issue, issue.changelog)
      );
    } catch {
      return { success: false, kind: 'processing', error: 'Failed to process Jira issues' };
    }

    try {
      const saved = await this.repository.save({
        boardId: board.metadata.boardId,
        boardName: board.metadata.boardName,
        boardType: board.metadata.boardType,
        periodDays,
        workflow: board.workflow,
        processedIssues
      });
      return saved.success ? saved : { ...saved, kind: 'persistence' };
    } catch {
      return { success: false, kind: 'persistence', error: 'Failed to save processed issues' };
    }
  }
}
