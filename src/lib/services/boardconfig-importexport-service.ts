import type { IBoardConfigRepository } from '../repositories/board-config.repository';
import type { BoardConfig, BoardConfigInput, BoardConfigMetadata, RepositoryResult } from '../repositories/board-config.types';

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
      // Validate structure
      if (!importData || typeof importData !== 'object') {
        return {
          success: false,
          error: 'Import data must be a valid object'
        };
      }

      const data = importData as Record<string, unknown>;

      // Validate metadata exists
      if (!data.metadata) {
        return {
          success: false,
          error: 'Import data must contain metadata'
        };
      }

      // Validate workflow exists
      if (!data.workflow) {
        return {
          success: false,
          error: 'Import data must contain workflow'
        };
      }

      const metadata = data.metadata as Record<string, unknown>;

      // Validate boardId exists
      if (!metadata.boardId) {
        return {
          success: false,
          error: 'Metadata must contain boardId'
        };
      }

      // Create input for save
      const input: BoardConfigInput = {
        boardId: metadata.boardId as string,
        boardName: (metadata.boardName as string) || '',
        boardType: (metadata.boardType as string) || 'scrum',
        periodDays: (metadata.periodDays as number) || 30,
        workflow: data.workflow as BoardConfig['workflow'],
      };

      // Save the imported config
      return await this.repository.save(input);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred during config import'
      };
    }
  }
}
