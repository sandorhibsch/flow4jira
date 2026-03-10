// src/lib/repositories/board-config.local.repository.test.ts

import { BoardConfigLocalRepository } from './board-config.local.repository';
import type { BoardConfigInput } from './board-config.types';
import { TEST_WORKFLOW, createProcessedIssues } from '../testutils/create-mocks';

describe('BoardConfigRepositoryLocalStorage', () => {
  let repository: BoardConfigLocalRepository;
  let localStorageMock: Record<string, string>;

  function createInput(overrides: Partial<BoardConfigInput> = {}): BoardConfigInput {
    return {
      boardId: '123',
      periodDays: 30,
      workflow: TEST_WORKFLOW,
      boardName: 'Test Board',
      boardType: 'scrum',
      ...overrides,
    };
  }

  beforeAll(() => {
    localStorageMock = {};
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: (key: string) => localStorageMock[key] || null,
        setItem: (key: string, value: string) => {
          localStorageMock[key] = value;
        },
        removeItem: (key: string) => {
          delete localStorageMock[key];
        },
        clear: () => {
          Object.keys(localStorageMock).forEach((k) => delete localStorageMock[k]);
        },
        key: (index: number) => Object.keys(localStorageMock)[index] || null,
        get length() {
          return Object.keys(localStorageMock).length;
        },
      },
      writable: true,
    });
  });

  beforeEach(() => {
    localStorage.clear();
    repository = new BoardConfigLocalRepository();
  });

  describe('save', () => {
    it('should save a new board configuration', async () => {
      const input = createInput();
      const result = await repository.save(input);
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
      const input = createInput();
      await repository.save(input);
      await new Promise((r) => setTimeout(r, 10));
      const updatedInput = createInput({ boardName: 'Updated Board' });
      const result = await repository.save(updatedInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.metadata.boardName).toBe('Updated Board');
      }
    });

    it('should save processed issues when provided', async () => {
      const processedIssues = createProcessedIssues();
      const input = createInput({ processedIssues });
      const result = await repository.save(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.processedIssues).toHaveLength(processedIssues.length);
        expect(result.data.processedIssues?.[0]?.key).toBe(processedIssues[0]?.key);
      }
    });

    it('should throw error if save failed', async () => {
      const input = createInput();

      const originalSetItem = localStorage.setItem;
      localStorage.setItem = () => { throw new Error('Storage error') };

      const result = await repository.save(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/Storage error/);
      }
      localStorage.setItem = originalSetItem;
    });

  });

  describe('findByBoardId', () => {
    it('should find an existing board configuration', async () => {
      await repository.save(createInput());
      const result = await repository.findByBoardId('123');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toBeNull();
        expect(result.data?.metadata.boardId).toBe('123');
      }
    });

    it('should return null for non-existent board', async () => {
      const result = await repository.findByBoardId('999');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });

    it('should throw error if board is invalid', async () => {
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = () => { return 'Invalid data' };

      const result = await repository.findByBoardId('999');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Unexpected token 'I', \"Invalid data\" is not valid JSON");
      }

      localStorage.getItem = originalGetItem;
    });

    it('should throw error if getting board from storage fails', async () => {
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = () => { throw new Error('Storage error') };

      const result = await repository.findByBoardId('999');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/Storage error/);
      }

      localStorage.getItem = originalGetItem;
    })
  });

  describe('findWorkflowByBoardId', () => {
    it('should find workflow for existing board', async () => {
      await repository.save(createInput());
      const result = await repository.findWorkflowByBoardId('123');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(TEST_WORKFLOW);
      }
    });

    it('should return null for non-existent board', async () => {
      const result = await repository.findWorkflowByBoardId('999');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });

    it('should throw error if workflow is invalid', async () => {
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = () => { return 'Invalid data' };

      const result = await repository.findWorkflowByBoardId('999');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Unexpected token 'I', \"Invalid data\" is not valid JSON");
      }

      localStorage.getItem = originalGetItem;
    });

    it('should throw error if getting workflow from storage fails', async () => {
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = () => { throw new Error('Storage error') };

      const result = await repository.findWorkflowByBoardId('999');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/Storage error/);
      }

      localStorage.getItem = originalGetItem;
    })
  });

  describe('findAll', () => {
    it('should return empty array when no boards exist', async () => {
      const result = await repository.listAll();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });

    it('should return all board metadata sorted by updatedAt desc', async () => {
      await repository.save(createInput({ boardId: '1', boardName: 'Board 1' }));
      await new Promise((r) => setTimeout(r, 10));
      await repository.save(createInput({ boardId: '2', boardName: 'Board 2' }));
      await new Promise((r) => setTimeout(r, 10));
      await repository.save(createInput({ boardId: '3', boardName: 'Board 3' }));
      const result = await repository.listAll();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(3);
        expect(result.data[0]?.boardId).toBe('3');
        expect(result.data[1]?.boardId).toBe('2');
        expect(result.data[2]?.boardId).toBe('1');
      }
    });

    it('should not include processedIssues in metadata', async () => {
      await repository.save(
        createInput({ processedIssues: createProcessedIssues() })
      );
      const result = await repository.listAll();
      expect(result.success).toBe(true);
      if (result.success && result.data && result.data[0]) {
        expect('processedIssues' in result.data[0]).toBe(false);
      }
    });

    it('should log error if one of the items from storage is invalid, return others', async () => {
      // Save three valid configs
      await repository.save(createInput({ boardId: '1', boardName: 'Board 1' }));
      await new Promise((r) => setTimeout(r, 10));
      await repository.save(createInput({ boardId: '2', boardName: 'Board 2' }));
      await new Promise((r) => setTimeout(r, 10));
      await repository.save(createInput({ boardId: '3', boardName: 'Board 3' }));

      // Patch localStorageMock so one key returns invalid data
      const keys = Object.keys(localStorageMock);
      const invalidKey = keys[2];
      if (invalidKey) {
        localStorageMock[invalidKey] = 'Invalid data';
      }

      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await repository.listAll();
      expect(result.success).toBe(true);
      if (result.success) {
        // Only two valid configs should be returned
        expect(result.data).toHaveLength(2);
        const boardIds = result.data.map(m => m.boardId);
        expect(boardIds).toContain('1');
        expect(boardIds).toContain('2');
        expect(boardIds).not.toContain('3');
      }
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  describe('delete', () => {
    it('should delete existing board configuration', async () => {
      await repository.save(createInput());
      const result = await repository.delete('123');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(true);
      }
      const findResult = await repository.findByBoardId('123');
      expect(findResult.success && findResult.data).toBeNull();
    });

    it('should return false for non-existent board', async () => {
      const result = await repository.delete('999');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(false);
      }
    });

    it('should throw error if deleting fails', async () => {
      const originalRemoveItem = localStorage.removeItem;
      localStorage.removeItem = () => { throw new Error('Delete error') };

      const result = await repository.delete('999');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/Delete error/);
      }

      localStorage.removeItem = originalRemoveItem;
    });
  });

  describe('exists', () => {
    it('should return true for existing board', async () => {
      await repository.save(createInput());
      const result = await repository.exists('123');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(true);
      }
    });

    it('should return false for non-existent board', async () => {
      const result = await repository.exists('999');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(false);
      }
    });

    it('should throw error if checking for existing board fails', async () => {
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = () => { throw new Error('Storage error') };

      const result = await repository.exists('999');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/Storage error/);
      }

      localStorage.getItem = originalGetItem;
    });
  });

  describe('exportConfig', () => {
    it('should export board metadata and workflow, excluding processed issues', async () => {
      const processedIssues = createProcessedIssues();
      const input = createInput({ processedIssues });
      await repository.save(input);
      const result = await repository.exportConfig('123');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          metadata: {
            boardId: '123',
            boardName: 'Test Board',
            boardType: 'scrum',
            periodDays: 30,
            updatedAt: expect.any(String),
          },
          workflow: TEST_WORKFLOW,
        });
      }
    });

    it('should return error if config not found', async () => {
      const result = await repository.exportConfig('nonexistent');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not found');
      }
    });
  });

  describe('importConfig', () => {
    it('should import a valid config with metadata and workflow', async () => {
      const exportData = {
        metadata: {
          boardId: '456',
          boardName: 'Imported Board',
          boardType: 'kanban',
          periodDays: 45,
          updatedAt: new Date().toISOString(),
        },
        workflow: { states: ['To Do', 'Doing', 'Done'] },
      };

      const result = await repository.importConfig(exportData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.metadata.boardId).toBe('456');
        expect(result.data.metadata.boardName).toBe('Imported Board');
        expect(result.data.workflow).toEqual({ states: ['To Do', 'Doing', 'Done'] });
        expect(result.data.processedIssues).toBeUndefined();
      }

      // Verify it was actually saved and can be retrieved
      const findResult = await repository.findByBoardId('456');
      expect(findResult.success).toBe(true);
      if (findResult.success) {
        expect(findResult.data?.metadata.boardName).toBe('Imported Board');
      }
    });

    it('should overwrite existing config when importing', async () => {
      const originalInput = createInput({ boardId: '789', boardName: 'Original Board' });
      await repository.save(originalInput);

      const importData = {
        metadata: {
          boardId: '789',
          boardName: 'Overwritten Board',
          boardType: 'scrum',
          periodDays: 60,
          updatedAt: new Date().toISOString(),
        },
        workflow: { states: ['New State 1', 'New State 2'] },
      };

      const result = await repository.importConfig(importData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.metadata.boardName).toBe('Overwritten Board');
      }

      // Verify the overwrite persisted
      const findResult = await repository.findByBoardId('789');
      expect(findResult.success).toBe(true);
      if (findResult.success) {
        expect(findResult.data?.metadata.boardName).toBe('Overwritten Board');
      }
    });

    it('should return error if metadata is missing', async () => {
      const invalidData = {
        workflow: { states: ['To Do', 'Done'] },
      };

      const result = await repository.importConfig(invalidData as any);
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

      const result = await repository.importConfig(invalidData as any);
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

      const result = await repository.importConfig(invalidData as any);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('boardId');
      }
    });

    it('should return error if save fails during import', async () => {
      const importData = {
        metadata: {
          boardId: '999',
          boardName: 'Test Board',
          boardType: 'scrum',
          periodDays: 30,
          updatedAt: new Date().toISOString(),
        },
        workflow: { states: ['To Do', 'Done'] },
      };

      const originalSetItem = localStorage.setItem;
      localStorage.setItem = () => { throw new Error('Import storage error') };

      const result = await repository.importConfig(importData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/Import storage error/);
      }

      localStorage.setItem = originalSetItem;
    });
  });
});
