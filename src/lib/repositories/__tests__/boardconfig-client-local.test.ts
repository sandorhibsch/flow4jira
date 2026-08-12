import { success } from "zod/v4";
import { BoardConfigLocalRepository } from "../board-config.local.repository";
import { BoardConfig, RepositoryResult, BoardConfigInput } from "../board-config.types";
import { BoardConfigClientLocal } from "../client/boardconfig-client-local";
import { createBoardConfig, createBoardConfigInput, mockBoardConfig, mockBoardConfigInput, TEST_WORKFLOW } from "@/lib/testutils/create-mocks";
import { BoardConfigMetadata } from "@/lib/services/workflow-config-service";

describe('BoardConfigClientLocal', () => {

  const boardConfigWithIssues = createBoardConfig();
  const mockBoardConfigMetadata: BoardConfigMetadata = { boardId: '123', boardName: 'Test Board', boardType: 'scrum', periodDays: '30', lastFetched: new Date().toISOString() };
  const mockRepositoryResponse: RepositoryResult<BoardConfig> = { success: true, data: boardConfigWithIssues };

  const mockLocalRepository = {
    save: jest.fn().mockResolvedValue(mockRepositoryResponse),
    findByBoardId: jest.fn().mockResolvedValue(mockRepositoryResponse),
    findWorkflowByBoardId: jest.fn().mockResolvedValue({ success: true, data: TEST_WORKFLOW }),
    listAll: jest.fn().mockResolvedValue({ success: true, data: [mockBoardConfigMetadata] }),
    delete: jest.fn().mockResolvedValue({ success: true, data: true }),
    exists: jest.fn().mockResolvedValue({ success: true, data: true }),
  };

  let boardConfigClient: BoardConfigClientLocal;

  beforeEach(() => {
    mockLocalRepository.save.mockReset().mockResolvedValue(mockRepositoryResponse);
    mockLocalRepository.findByBoardId.mockReset().mockResolvedValue(mockRepositoryResponse);
    mockLocalRepository.findWorkflowByBoardId.mockReset().mockResolvedValue({ success: true, data: TEST_WORKFLOW });
    mockLocalRepository.listAll.mockReset().mockResolvedValue({ success: true, data: [mockBoardConfigMetadata] });
    mockLocalRepository.delete.mockReset().mockResolvedValue({ success: true, data: true });
    mockLocalRepository.exists.mockReset().mockResolvedValue({ success: true, data: true });
    boardConfigClient = new BoardConfigClientLocal(mockLocalRepository);
  });

  describe('save', () => {

    const mockBoardConfigInput: BoardConfigInput = createBoardConfigInput();

    it('should save a new board configuration', async () => {
      const result = await boardConfigClient.save(mockBoardConfigInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.metadata.boardId).toBe('123');
        expect(result.data.metadata.boardName).toBe('Test Board');
        expect(result.data.metadata.periodDays).toBe(30);
        expect(result.data.workflow).toEqual(TEST_WORKFLOW);
        expect(result.data.metadata.updatedAt).toBeInstanceOf(Date);
      }
    });

    it('should update an existing board configuration', async () => {

      await boardConfigClient.save(mockBoardConfigInput);
      const updatedConfig = createBoardConfig({ metadata: { boardId: '123', boardName: 'Updated Board', periodDays: 30, updatedAt: new Date() } })
      mockLocalRepository.save.mockResolvedValueOnce({ success: true, data: updatedConfig });

      const updatedInput = createBoardConfigInput({ boardName: 'Updated Board' });
      const result = await boardConfigClient.save(updatedInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.metadata.boardName).toBe('Updated Board');
      }
    });

    it('should save processed issues when provided', async () => {

      const result = await boardConfigClient.save(mockBoardConfigInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.processedIssues).toBeDefined();
        expect(result.data.processedIssues).toHaveLength(boardConfigWithIssues.processedIssues!.length)
      }
    });

    it('should throw error if save failed', async () => {

      mockLocalRepository.save.mockResolvedValueOnce({ success: false, error: 'Storage error' });

      const result = await boardConfigClient.save(mockBoardConfigInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/Storage error/);
      }

    });
  });

  describe('findByBoardId', () => {
    it('should find an existing board configuration', async () => {
      const result = await boardConfigClient.findByBoardId('123');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toBeNull();
        expect(result.data?.metadata.boardId).toBe('123');
      }
    });

    it('should return null for non-existent board', async () => {
      mockLocalRepository.findByBoardId.mockResolvedValueOnce({ success: true, data: null })

      const result = await boardConfigClient.findByBoardId('999');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });

    it('should throw error if board is invalid', async () => {
      mockLocalRepository.findByBoardId.mockResolvedValueOnce({ success: false, error: 'Invalid data' })

      const result = await boardConfigClient.findByBoardId('999');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });
  });

  describe('findWorkflowByBoardId', () => {
    it('should find workflow for existing board', async () => {
      const result = await boardConfigClient.findWorkflowByBoardId('123');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(TEST_WORKFLOW);
      }
    });

    it('should return null for non-existent board', async () => {

      mockLocalRepository.findWorkflowByBoardId.mockResolvedValueOnce({ success: true, data: null });
      const result = await boardConfigClient.findWorkflowByBoardId('999');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });

    it('should throw error if workflow is invalid', async () => {
      mockLocalRepository.findWorkflowByBoardId.mockResolvedValueOnce({ success: false, error: "Invalid data" });

      const result = await boardConfigClient.findWorkflowByBoardId('999');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });
  });

  describe('listAll', () => {

    it('should return empty array when no boards exist', async () => {
      mockLocalRepository.listAll.mockResolvedValueOnce({ success: true, data: [] });

      const result = await boardConfigClient.listAll();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });

    it('should return all board metadata', async () => {

      const boardConfig1: BoardConfigMetadata = { boardId: '1', boardName: 'Board 1', boardType: 'scrum', periodDays: '30', lastFetched: new Date().toISOString() };
      const boardConfig2: BoardConfigMetadata = { boardId: '2', boardName: 'Board 1', boardType: 'scrum', periodDays: '30', lastFetched: new Date().toISOString() };
      const boardConfig3: BoardConfigMetadata = { boardId: '3', boardName: 'Board 1', boardType: 'scrum', periodDays: '30', lastFetched: new Date().toISOString() };
      mockLocalRepository.listAll.mockResolvedValueOnce({ success: true, data: [boardConfig1, boardConfig2, boardConfig3] });

      const result = await boardConfigClient.listAll();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(3);
        expect(result.data[0]?.boardId).toBe('1');
      }
    });

  });

  describe('delete', () => {
    it('should delete existing board configuration', async () => {
      const result = await boardConfigClient.delete('123');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(true);
      }
    });

    it('should return false for non-existent board', async () => {

      mockLocalRepository.delete.mockResolvedValueOnce({ success: true, data: false });
      const result = await boardConfigClient.delete('999');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(false);
      }
    });

    it('should throw error if deleting fails', async () => {
      mockLocalRepository.delete.mockResolvedValueOnce({ success: false, error: "Delete error" });

      const result = await boardConfigClient.delete('999');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/Delete error/);
      }
    });
  });

  describe('exists', () => {
    it('should return true for existing board', async () => {
      const result = await boardConfigClient.exists('123');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(true);
      }
    });

    it('should return false for non-existent board', async () => {
      mockLocalRepository.exists.mockResolvedValue({ success: true, data: false });

      const result = await boardConfigClient.exists('999');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(false);
      }
    });
  });

});
