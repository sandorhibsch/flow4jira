// src/lib/repositories/board-config.repository.test.ts

import { BoardConfigMockRepository } from './board-config.mock.repository';
import type { BoardConfigInput } from './board-config.types';
import { TEST_WORKFLOW } from '../testutils/create-mocks';

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

describe('BoardConfigRepository', () => {
  let repository: BoardConfigMockRepository;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
    repository = new BoardConfigMockRepository();
  });

  afterEach(() => jest.useRealTimers());

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

      // Wait a bit to ensure different timestamp
      jest.advanceTimersByTime(1_000);

      const updatedInput = createInput({ boardName: 'Updated Board' });
      const result = await repository.save(updatedInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.metadata.boardName).toBe('Updated Board');
      }
    });

    it('should save processed issues when provided', async () => {
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

      const input = createInput({ processedIssues });
      const result = await repository.save(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.processedIssues).toHaveLength(1);
        expect(result.data.processedIssues?.[0]?.key).toBe('TEST-1');
      }
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
  });

  describe('listAll', () => {
    it('should return empty array when no boards exist', async () => {
      const result = await repository.listAll();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });

    it('should return all board metadata sorted by updatedAt desc', async () => {
      await repository.save(createInput({ boardId: '1', boardName: 'Board 1' }));
      jest.advanceTimersByTime(1_000);
      await repository.save(createInput({ boardId: '2', boardName: 'Board 2' }));
      jest.advanceTimersByTime(1_000);
      await repository.save(createInput({ boardId: '3', boardName: 'Board 3' }));

      const result = await repository.listAll();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(3);
        expect(result.data[0]?.boardId).toBe('3'); // Most recent first
        expect(result.data[1]?.boardId).toBe('2');
        expect(result.data[2]?.boardId).toBe('1');
      }
    });

    it('should not include processedIssues in metadata', async () => {
      await repository.save(
        createInput({
          processedIssues: [
            {
              key: 'TEST-1',
              summary: 'Test',
              issueType: 'Story',
              created: new Date(),
              flowHistory: [],
              currentStage: TEST_WORKFLOW.stages[0]!,
              currentStatus: 'New',
              leadTimeDays: 0,
              cycleTimeDays: 0,
              ageDays: 0,
            },
          ],
        })
      );

      const result = await repository.listAll();

      expect(result.success).toBe(true);
      if (result.success && result.data && result.data[0]) {
        // Metadata should not have processedIssues property
        expect('processedIssues' in result.data[0]).toBe(false);
      }
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

      // Verify it's deleted
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
  });
});
