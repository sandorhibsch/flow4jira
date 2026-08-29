import type { IBoardConfigRepository } from '../repositories/board-config.repository';
import type { BoardConfig, BoardConfigMetadata, RepositoryResult } from '../repositories/board-config.types';
import { parseBoardConfigImportDocument } from './board-config-import-document';

export class BoardConfigImportExportService {
  constructor(private readonly repository: IBoardConfigRepository) {}

  async exportConfig(boardId: string): Promise<RepositoryResult<{ metadata: Omit<BoardConfigMetadata, 'updatedAt'> & { updatedAt: string }; workflow: BoardConfig['workflow'] }>> {
    try {
      const findResult = await this.repository.findByBoardId(boardId);

      if (!findResult.success || !findResult.data) {
        return {
          success: false,
          error: `Board config not found for boardId: ${boardId}`
        };
      }
      const config = findResult.data;
      // Ensure updatedAt is serialized as a string for export
      const metadata = {
        ...config.metadata,
        updatedAt: config.metadata.updatedAt instanceof Date
          ? config.metadata.updatedAt.toISOString()
          : config.metadata.updatedAt
      };
      return {
        success: true,
        data: {
          metadata: metadata,
          workflow: config.workflow
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : `Export failed: Board not found for board ${boardId}`
      };
    }
  }

  async importConfig(importData: unknown): Promise<RepositoryResult<BoardConfig>> {
    try {
      const parsed = parseBoardConfigImportDocument(importData);
      if (!parsed.success) return parsed;

      return await this.repository.save(parsed.data);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred during config import'
      };
    }
  }
}
