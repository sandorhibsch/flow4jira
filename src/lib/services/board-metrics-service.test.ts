import type {
  BoardConfig,
  BoardConfigInput,
  RepositoryResult
} from '@/lib/repositories/board-config.types';
import type { JiraIssueSource } from './board-metrics.contracts';
import { BoardMetricsService } from './board-metrics-service';
import {
  createBoardConfig,
  createMockProcessedIssue,
  mockJiraIssue
} from '@/lib/testutils/create-mocks';
import type { JiraIssue } from '@/lib/jira/jira-types';
import type { processJiraIssue } from '@/lib/flow/processor';

class MemoryRepository {
  board: BoardConfig | null = createBoardConfig();
  saves: BoardConfigInput[] = [];
  failure: string | null = null;
  async findByBoardId(id: string): Promise<RepositoryResult<BoardConfig | null>> {
    return this.failure
      ? { success: false, error: this.failure }
      : { success: true, data: this.board?.metadata.boardId === id ? this.board : null };
  }
  async save(input: BoardConfigInput): Promise<RepositoryResult<BoardConfig>> {
    this.saves.push(input);
    if (this.failure) return { success: false, error: this.failure };
    this.board = {
      metadata: {
        boardId: input.boardId,
        boardName: input.boardName,
        boardType: input.boardType,
        periodDays: input.periodDays,
        updatedAt: new Date('2026-10-18')
      },
      workflow: input.workflow,
      processedIssues: input.processedIssues
    };
    return { success: true, data: this.board };
  }
}

class IssueSourceFake implements JiraIssueSource {
  queries: Parameters<JiraIssueSource['fetchIssues']>[0][] = [];
  result: RepositoryResult<JiraIssue[]> = { success: true, data: [mockJiraIssue] };
  async fetchIssues(query: Parameters<JiraIssueSource['fetchIssues']>[0]) {
    this.queries.push(query);
    return this.result;
  }
}

describe('BoardMetricsService', () => {
  let repository: MemoryRepository;
  let source: IssueSourceFake;
  let service: BoardMetricsService;
  const processed = createMockProcessedIssue();
  let calls: Parameters<typeof processJiraIssue>[];
  beforeEach(() => {
    repository = new MemoryRepository();
    source = new IssueSourceFake();
    calls = [];
    service = new BoardMetricsService(repository, source, (...args) => {
      calls.push(args);
      return processed;
    });
  });

  it('loads the board identified by the caller', async () => {
    const board = createBoardConfig();
    board.metadata.boardId = 'delivery';
    repository.board = board;
    expect(await service.load('delivery')).toEqual({ success: true, data: board });
  });

  it('queries Jira for the requested board and period', async () => {
    const board = createBoardConfig();
    await service.refresh(board, 60);
    expect(source.queries).toEqual([{ boardId: board.metadata.boardId, periodDays: 60 }]);
  });

  it('processes each issue with its own changelog and the board workflow', async () => {
    const board = createBoardConfig();
    const other = { ...mockJiraIssue, key: 'DEL-2', changelog: undefined };
    source.result = { success: true, data: [mockJiraIssue, other] };
    await service.refresh(board, 30);
    expect(calls).toEqual([
      [board.workflow, mockJiraIssue, mockJiraIssue.changelog],
      [board.workflow, other, undefined]
    ]);
  });

  it('saves the processed issues with the refreshed board configuration', async () => {
    const board = createBoardConfig();
    await service.refresh(board, 60);
    expect(repository.saves).toEqual([
      {
        boardId: board.metadata.boardId,
        boardName: board.metadata.boardName,
        boardType: board.metadata.boardType,
        periodDays: 60,
        workflow: board.workflow,
        processedIssues: [processed]
      }
    ]);
  });

  it('returns the snapshot supplied by persistence', async () => {
    const saved = createBoardConfig();
    saved.metadata.updatedAt = new Date('2030-01-01');
    repository.save = async () => ({ success: true, data: saved });
    const refreshed = await service.refresh(createBoardConfig(), 60);
    expect(refreshed).toEqual({ success: true, data: saved });
  });

  it('returns null for a missing board', async () => {
    expect(await service.load('missing')).toEqual({ success: true, data: null });
  });

  it('preserves the load failure reason', async () => {
    repository.failure = 'Database unavailable';
    expect(await service.load('123')).toEqual({ success: false, error: 'Database unavailable' });
  });

  it('normalizes a rejected load', async () => {
    repository.findByBoardId = async () => {
      throw new Error('offline');
    };
    expect(await service.load('123')).toEqual({
      success: false,
      error: 'Failed to load board configuration'
    });
  });

  it('rejects a missing board ID before lookup', async () => {
    const lookup = jest.spyOn(repository, 'findByBoardId');
    expect(await service.load('')).toEqual({ success: false, error: 'Board ID is required' });
    expect(lookup).not.toHaveBeenCalled();
  });

  it.each([0, -1, 366, 1.5, NaN])(
    'rejects invalid period %s before fetching or saving',
    async (period) => {
      expect(await service.refresh(createBoardConfig(), period)).toMatchObject({
        success: false,
        kind: 'configuration'
      });
      expect(source.queries).toEqual([]);
      expect(repository.saves).toEqual([]);
    }
  );

  it('persists an empty refresh to replace stale results', async () => {
    source.result = { success: true, data: [] };
    await service.refresh(createBoardConfig(), 30);
    expect(repository.board?.processedIssues).toEqual([]);
    expect(calls).toEqual([]);
  });

  it('preserves source failures without saving', async () => {
    source.result = { success: false, error: 'Jira unavailable' };
    expect(await service.refresh(createBoardConfig(), 30)).toEqual({
      success: false,
      kind: 'fetch',
      error: 'Jira unavailable'
    });
    expect(repository.saves).toEqual([]);
  });

  it('normalizes source exceptions', async () => {
    source.fetchIssues = async () => {
      throw new Error('offline');
    };
    expect(await service.refresh(createBoardConfig(), 30)).toEqual({
      success: false,
      kind: 'fetch',
      error: 'Failed to fetch flow metrics'
    });
    expect(repository.saves).toEqual([]);
  });

  it('does not persist partial processing results', async () => {
    const invalidIssue = { ...mockJiraIssue, key: 'DEL-2' };
    source.result = { success: true, data: [mockJiraIssue, invalidIssue] };
    service = new BoardMetricsService(repository, source, (...args) => {
      calls.push(args);
      if (args[1] === invalidIssue) throw new Error('bad history');
      return processed;
    });
    expect(await service.refresh(createBoardConfig(), 30)).toMatchObject({
      success: false,
      kind: 'processing'
    });
    expect(calls.map(([, issue]) => issue.key)).toEqual([mockJiraIssue.key, invalidIssue.key]);
    expect(repository.saves).toEqual([]);
  });

  it('preserves the repository failure reason', async () => {
    repository.failure = 'Storage quota exceeded';
    expect(await service.refresh(createBoardConfig(), 30)).toEqual({
      success: false,
      kind: 'persistence',
      error: 'Storage quota exceeded'
    });
  });

  it('normalizes persistence exceptions', async () => {
    repository.save = async () => {
      throw new Error('offline');
    };
    expect(await service.refresh(createBoardConfig(), 30)).toEqual({
      success: false,
      kind: 'persistence',
      error: 'Failed to save processed issues'
    });
  });
});
