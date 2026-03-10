import { IBoardConfigRepository } from "./board-config.repository";
import { BoardConfig, BoardConfigInput, BoardConfigMetadata, RepositoryResult } from "./board-config.types";

const STORAGE_PREFIX = 'workflow:board:';

export class BoardConfigLocalRepository implements IBoardConfigRepository {

  async save(input: BoardConfigInput): Promise<RepositoryResult<BoardConfig>> {
    try {
      const key = `${STORAGE_PREFIX}${input.boardId}`;

      const config: BoardConfig = {
        metadata: {
          boardId: input.boardId,
          boardName: input.boardName,
          boardType: input.boardType,
          periodDays: input.periodDays,
          updatedAt: new Date()
        },
        workflow: input.workflow,
        processedIssues: input.processedIssues
      }

      localStorage.setItem(key, JSON.stringify(config));
      return {
        success: true,
        data: config
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : `Unknown error occurred saving board ${input.boardId}`
      }
    }
  }

  async findByBoardId(boardId: string): Promise<RepositoryResult<BoardConfig | null>> {
    try {
      const key = `${STORAGE_PREFIX}${boardId}`;
      const data = localStorage.getItem(key);

      return {
        success: true,
        data: data ? JSON.parse(data) : null
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : `Unknown error occurred finding board by ID ${boardId}`
      }
    }
  }

  async findWorkflowByBoardId(boardId: string): Promise<RepositoryResult<BoardConfig["workflow"] | null>> {
    try {
      const key = `${STORAGE_PREFIX}${boardId}`;
      const data = localStorage.getItem(key);

      return {
        success: true,
        data: data ? JSON.parse(data)["workflow"] : null
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : `Unknown error occurred loading workflow for board ${boardId}`
      }
    }
  }

  async listAll(): Promise<RepositoryResult<BoardConfigMetadata[]>> {
    const configs: BoardConfigMetadata[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const boardConfig: BoardConfig = JSON.parse(data);
            configs.push(boardConfig.metadata);
          }
        } catch (error) {
          console.error(`Failed to parse config for board ${key}`);
        }
      }
    }

    return {
      success: true,
      data: configs.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() -
          new Date(a.updatedAt).getTime()
      )
    }
  }

  async delete(boardId: string): Promise<RepositoryResult<boolean>> {
    try {
      const key = `${STORAGE_PREFIX}${boardId}`;
      const existing = localStorage.getItem(key);

      localStorage.removeItem(key);
      return {
        success: true,
        data: existing ? true : false
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : `Unknown error occurred deleting board ${boardId}`
      }
    }
  }

  async exists(boardId: string): Promise<RepositoryResult<boolean>> {
    try {
      const key = `${STORAGE_PREFIX}${boardId}`;
      const exists = localStorage.getItem(key);

      return {
        success: true,
        data: exists ? true : false
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : `Unknown error looking up board ${boardId}`
      }
    }
  }

  async exportConfig(boardId: string): Promise<RepositoryResult<{ metadata: Omit<BoardConfigMetadata, 'updatedAt'> & { updatedAt: string }; workflow: BoardConfig['workflow'] }>> {
    try {
      const findResult = await this.findByBoardId(boardId);
      if (!findResult.success) {
        return findResult as RepositoryResult<{ metadata: Omit<BoardConfigMetadata, 'updatedAt'> & { updatedAt: string }; workflow: BoardConfig['workflow'] }>;
      }
      if (!findResult.data) {
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
          metadata: metadata as Omit<BoardConfigMetadata, 'updatedAt'> & { updatedAt: string },
          workflow: config.workflow
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : `Unknown error occurred exporting config for board ${boardId}`
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
      return await this.save(input);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred during config import'
      };
    }
  }

}

