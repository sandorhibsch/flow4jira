// src/lib/repositories/index.ts

export * from './board-config.types';
export * from './board-config.repository';
export * from './board-config.sqlite.repository';
export * from './board-config.mock.repository';

import { IBoardConfigRepository } from './board-config.repository';

// Singleton instance of the repository
let boardConfigRepository: IBoardConfigRepository | null = null;

/**
 * Get the BoardConfig repository instance.
 * Uses SQLite by default, lazily loaded to avoid import issues in tests.
 */
export async function getBoardConfigRepository(): Promise<IBoardConfigRepository> {
  if (!boardConfigRepository) {
    // Lazy import to avoid issues when Prisma client isn't generated
    const { default: prisma } = await import('../db/prisma');
    const { BoardConfigSqliteRepository } = await import('./board-config.sqlite.repository');
    boardConfigRepository = new BoardConfigSqliteRepository(prisma);
  }
  return boardConfigRepository;
}

/**
 * Get repository synchronously (only works after first async call or if mock is set)
 */
export function getBoardConfigRepositorySync(): IBoardConfigRepository {
  if (!boardConfigRepository) {
    throw new Error('Repository not initialized. Call getBoardConfigRepository() first or use setBoardConfigRepository()');
  }
  return boardConfigRepository;
}

/**
 * Reset the repository instance (useful for testing)
 */
export function resetBoardConfigRepository(): void {
  boardConfigRepository = null;
}

/**
 * Set a custom repository instance (useful for testing)
 */
export function setBoardConfigRepository(repo: IBoardConfigRepository): void {
  boardConfigRepository = repo;
}
