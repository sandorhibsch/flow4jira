// src/lib/services/board-config.service.test.ts

import { BoardConfigService } from './board-config.service';
import { BoardConfigMockRepository } from '../repositories/board-config.mock.repository';
import { setBoardConfigRepository, resetBoardConfigRepository } from '../repositories';
import { TEST_WORKFLOW } from '../testutils/create-mocks';

describe('BoardConfigService', () => {
  let mockRepository: BoardConfigMockRepository;

  beforeEach(() => {
    mockRepository = new BoardConfigMockRepository();
    setBoardConfigRepository(mockRepository);
  });

  afterEach(() => {
    resetBoardConfigRepository();
  });

  describe('save', () => {
    it('should save a board configuration', async () => {
      const result = await BoardConfigService.save(
        '123',
        30,
        TEST_WORKFLOW,
        'Test Board',
        'scrum'
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.metadata.boardId).toBe('123');
        expect(result.data.metadata.boardName).toBe('Test Board');
        expect(result.data.workflow).toEqual(TEST_WORKFLOW);
      }
    });

    it('should save with processed issues', async () => {
      const processedIssues = [
        {
          key: 'TEST-1',
          summary: 'Test Issue',
          issueType: 'Story',
          created: new Date(),
          flowHistory: [],
          currentStage: TEST_WORKFLOW.stages[0]!,
          currentStatus: 'New',
          leadTimeDays: 0,
          cycleTimeDays: 0,
          ageDays: 5,
        },
      ];

      const result = await BoardConfigService.save(
        '123',
        30,
        TEST_WORKFLOW,
        'Test Board',
        'scrum',
        processedIssues
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.processedIssues).toHaveLength(1);
      }
    });
  });

  describe('load', () => {
    it('should load workflow for existing board', async () => {
      await BoardConfigService.save('123', 30, TEST_WORKFLOW, 'Test Board');

      const workflow = await BoardConfigService.load('123');

      expect(workflow).toEqual(TEST_WORKFLOW);
    });

    it('should return null for non-existent board', async () => {
      const workflow = await BoardConfigService.load('999');

      expect(workflow).toBeNull();
    });
  });

  describe('loadWithMetadata', () => {
    it('should load full config for existing board', async () => {
      await BoardConfigService.save('123', 30, TEST_WORKFLOW, 'Test Board', 'scrum');

      const config = await BoardConfigService.loadWithMetadata('123');

      expect(config).not.toBeNull();
      expect(config?.metadata.boardId).toBe('123');
      expect(config?.metadata.boardName).toBe('Test Board');
      expect(config?.metadata.boardType).toBe('scrum');
      expect(config?.workflow).toEqual(TEST_WORKFLOW);
    });

    it('should return null for non-existent board', async () => {
      const config = await BoardConfigService.loadWithMetadata('999');

      expect(config).toBeNull();
    });
  });

  describe('listAll', () => {
    it('should return empty array when no boards exist', async () => {
      const boards = await BoardConfigService.listAll();

      expect(boards).toEqual([]);
    });

    it('should return all board metadata', async () => {
      await BoardConfigService.save('1', 30, TEST_WORKFLOW, 'Board 1');
      await BoardConfigService.save('2', 60, TEST_WORKFLOW, 'Board 2');

      const boards = await BoardConfigService.listAll();

      expect(boards).toHaveLength(2);
    });
  });

  describe('delete', () => {
    it('should delete existing board', async () => {
      await BoardConfigService.save('123', 30, TEST_WORKFLOW);

      const deleted = await BoardConfigService.delete('123');

      expect(deleted).toBe(true);

      const config = await BoardConfigService.loadWithMetadata('123');
      expect(config).toBeNull();
    });

    it('should return false for non-existent board', async () => {
      const deleted = await BoardConfigService.delete('999');

      expect(deleted).toBe(false);
    });
  });

  describe('exists', () => {
    it('should return true for existing board', async () => {
      await BoardConfigService.save('123', 30, TEST_WORKFLOW);

      const exists = await BoardConfigService.exists('123');

      expect(exists).toBe(true);
    });

    it('should return false for non-existent board', async () => {
      const exists = await BoardConfigService.exists('999');

      expect(exists).toBe(false);
    });
  });
});
