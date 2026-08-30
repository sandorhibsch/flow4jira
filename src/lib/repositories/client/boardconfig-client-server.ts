import { IBoardConfigRepository } from '../board-config.repository';
import type { BoardConfig, BoardConfigInput, RepositoryResult } from '../board-config.types';
import type { BoardConfigMetadata } from '../board-config.types';
import { serializeProcessedIssues, deserializeProcessedIssues } from '@/lib/serializers/processed-issue.serializer';

export class BoardConfigClientServer implements IBoardConfigRepository {
  private readonly fetcher: typeof fetch;

  constructor(fetcher?: typeof fetch) {
    this.fetcher = fetcher ?? globalThis.fetch.bind(globalThis);
  }

  private async callApi(path: string, init?: RequestInit) {
    const res = init ? await this.fetcher(path, init) : await this.fetcher(path);
    if (!res.ok) throw new Error(`API returned ${res.status}`);
    return res.json();
  }

  private apiError(error: unknown): RepositoryResult<never> {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to communicate with the persistence API',
    };
  }

  async save(input: BoardConfigInput): Promise<RepositoryResult<BoardConfig>> {
    try {
      const body = {
        ...input,
        processedIssues: input.processedIssues ? serializeProcessedIssues(input.processedIssues) : undefined
      };
      const json = await this.callApi('/api/board-config', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
      if (json && json.success) {
        if (json.data && json.data.processedIssues) {
          json.data.processedIssues = deserializeProcessedIssues(json.data.processedIssues);
        }
        return json;
      }
      return { success: false, error: json?.error || 'Unknown API error' };
    } catch (err) {
      return this.apiError(err);
    }
  }

  async findByBoardId(boardId: string): Promise<RepositoryResult<BoardConfig | null>> {
    try {
      const json = await this.callApi(`/api/board-config?boardId=${encodeURIComponent(boardId)}`);
      if (json && json.success) {
        if (json.data && json.data.processedIssues) {
          json.data.processedIssues = deserializeProcessedIssues(json.data.processedIssues);
        }
        return json;
      }
      return { success: false, error: json?.error || 'Unknown API error' };
    } catch (err) {
      return this.apiError(err);
    }
  }

  async findWorkflowByBoardId(boardId: string): Promise<RepositoryResult<BoardConfig['workflow'] | null>> {
    const r = await this.findByBoardId(boardId);
    return r.success ? { success: true, data: r.data ? r.data.workflow : null } : r;
  }

  async listAll(): Promise<RepositoryResult<BoardConfigMetadata[]>> {
    try {
      const json = await this.callApi('/api/board-config/list');
      return json;
    } catch (error) {
      return this.apiError(error);
    }
  }

  async delete(boardId: string): Promise<RepositoryResult<boolean>> {
    try {
      const json = await this.callApi(`/api/board-config?boardId=${encodeURIComponent(boardId)}`, { method: 'DELETE' });
      return json;
    } catch (err) {
      return this.apiError(err);
    }
  }

  async exists(boardId: string): Promise<RepositoryResult<boolean>> {
    try {
      const json = await this.callApi(`/api/board-config/exists?boardId=${encodeURIComponent(boardId)}`);
      return json;
    } catch (err) {
      return this.apiError(err);
    }
  }
}
