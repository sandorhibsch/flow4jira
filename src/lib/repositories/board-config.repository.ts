// src/lib/repositories/board-config.repository.ts

import type {
  BoardConfig,
  BoardConfigInput,
  BoardConfigMetadata,
  RepositoryResult,
} from './board-config.types';

/**
 * Repository interface for board configurations.
 * Allows swapping implementations (SQLite, localStorage, etc.)
 */
export interface IBoardConfigRepository {
  /**
   * Save or update a board configuration
   */
  save(input: BoardConfigInput): Promise<RepositoryResult<BoardConfig>>;

  /**
   * Find a board configuration by boardId
   */
  findByBoardId(boardId: string): Promise<RepositoryResult<BoardConfig | null>>;

  /**
   * Find only the workflow for a board (without processed issues)
   */
  findWorkflowByBoardId(boardId: string): Promise<RepositoryResult<BoardConfig['workflow'] | null>>;

  /**
   * List all board configurations (metadata only, no processed issues)
   */
  listAll(): Promise<RepositoryResult<BoardConfigMetadata[]>>;

  /**
   * Delete a board configuration
   */
  delete(boardId: string): Promise<RepositoryResult<boolean>>;

  /**
   * Check if a board configuration exists
   */
  exists(boardId: string): Promise<RepositoryResult<boolean>>;
}
