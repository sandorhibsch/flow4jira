import { BoardConfigLocalRepository } from "@/lib/repositories/board-config.local.repository";
import { BoardConfig, BoardConfigInput, RepositoryResult } from "@/lib/repositories/board-config.types";

import { TEST_WORKFLOW, mockBoardConfig } from "@/lib/testutils/create-mocks";
import { BoardConfigImportExportService } from "../boardconfig-importexport-service";
import { BoardConfigClientLocal } from "@/lib/repositories/client/boardconfig-client-local";

describe('BoardConfigImportExportService', () => {

  const service = new BoardConfigImportExportService();

  describe('exportConfig', () => {

    const findBoardByIdSpy = jest
      .spyOn(BoardConfigClientLocal.prototype, 'findByBoardId')
      .mockResolvedValue({ success: true, data: mockBoardConfig } as RepositoryResult<BoardConfig>);

    it('should export board metadata and workflow, exclude processed issues and serialize date', async () => {
      //await repository.save(input);
      const result = await service.exportConfig('123');

      expect(findBoardByIdSpy).toHaveBeenCalled();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          metadata: {
            boardId: mockBoardConfig.metadata.boardId,
            boardName: mockBoardConfig.metadata.boardName,
            boardType: mockBoardConfig.metadata.boardType,
            periodDays: mockBoardConfig.metadata.periodDays,
            updatedAt: expect.any(String),
          },
          workflow: TEST_WORKFLOW,
        });
      }
    });

    it('should return error if config not found', async () => {
      findBoardByIdSpy.mockRejectedValue({ success: false, error: 'Board not found' });
      const result = await service.exportConfig('nonexistent');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Export failed: Board not found for board nonexistent');
      }
    });
  });

  describe('importConfig', () => {
    const saveSpy = jest.spyOn(BoardConfigClientLocal.prototype, 'save')
      .mockResolvedValue({ success: true, data: mockBoardConfig } as RepositoryResult<BoardConfig>);

    it('should import a valid config with metadata and workflow', async () => {

      const result = await service.importConfig(mockBoardConfig);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          metadata: {
            boardId: mockBoardConfig.metadata.boardId,
            boardName: mockBoardConfig.metadata.boardName,
            boardType: mockBoardConfig.metadata.boardType,
            periodDays: mockBoardConfig.metadata.periodDays,
            updatedAt: mockBoardConfig.metadata.updatedAt
          },
          workflow: TEST_WORKFLOW,
        });
      }

      // Verify it was actually saved
      expect(saveSpy).toHaveBeenCalled();
    });

    it('should return error if metadata is missing', async () => {
      const invalidData = {
        workflow: { states: ['To Do', 'Done'] },
      };

      const result = await service.importConfig(invalidData as any);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('metadata');
      }
    });

    it('should return error if workflow is missing', async () => {
      const invalidData = {
        metadata: {
          boardId: '999',
          boardName: 'Bad Config',
          boardType: 'scrum',
          periodDays: 30,
          updatedAt: new Date().toISOString(),
        },
      };

      const result = await service.importConfig(invalidData as any);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('workflow');
      }
    });

    it('should return error if boardId is missing from metadata', async () => {
      const invalidData = {
        metadata: {
          boardName: 'No ID Board',
          boardType: 'scrum',
          periodDays: 30,
          updatedAt: new Date().toISOString(),
        },
        workflow: { states: ['To Do', 'Done'] },
      };

      const result = await service.importConfig(invalidData as any);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('boardId');
      }
    });

    it('should return error if save fails during import', async () => {

      saveSpy.mockRejectedValueOnce({ success: false, error: 'Error during save' })

      const result = await service.importConfig(mockBoardConfig);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Unknown error occurred during config import')
      }

    });
  });
});