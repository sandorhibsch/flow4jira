// src/lib/repositories/board-config.mock.repository.ts

import type { IBoardConfigRepository } from './board-config.repository';
import type {
  BoardConfig,
  BoardConfigInput,
  BoardConfigMetadata,
  RepositoryResult,
} from './board-config.types';
import type { WorkflowDefinition } from '../jira/workflow-config';

/**
 * In-memory mock implementation of the BoardConfig repository for testing
 */
export class BoardConfigMockRepository implements IBoardConfigRepository {
  private store: Map<string, BoardConfig> = new Map();

  async save(input: BoardConfigInput): Promise<RepositoryResult<BoardConfig>> {
    const now = new Date();
    const existing = this.store.get(input.boardId);

    const config: BoardConfig = {
      metadata: {
        boardId: input.boardId,
        boardName: input.boardName,
        boardType: input.boardType,
        periodDays: input.periodDays,
        updatedAt: now,
      },
      workflow: input.workflow,
      processedIssues: input.processedIssues,
    };

    this.store.set(input.boardId, config);

    return { success: true, data: config };
  }

  async findByBoardId(boardId: string): Promise<RepositoryResult<BoardConfig | null>> {
    const config = this.store.get(boardId) ?? null;
    return { success: true, data: config };
  }

  async findWorkflowByBoardId(
    boardId: string
  ): Promise<RepositoryResult<WorkflowDefinition | null>> {
    const config = this.store.get(boardId);
    return { success: true, data: config?.workflow ?? null };
  }

  async listAll(): Promise<RepositoryResult<BoardConfigMetadata[]>> {
    const metadata = Array.from(this.store.values())
      .map((c) => c.metadata)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    return { success: true, data: metadata };
  }

  async delete(boardId: string): Promise<RepositoryResult<boolean>> {
    const existed = this.store.has(boardId);
    this.store.delete(boardId);
    return { success: true, data: existed };
  }

  async exists(boardId: string): Promise<RepositoryResult<boolean>> {
    return { success: true, data: this.store.has(boardId) };
  }

  /**
   * Clear all data (useful for test cleanup)
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get the number of stored configs (useful for test assertions)
   */
  size(): number {
    return this.store.size;
  }
}
