// src/lib/services/workflow-config-service.test.ts

import { WorkflowConfigService } from './workflow-config-service';
import { TEST_WORKFLOW, createProcessedIssues } from '../testutils/create-mocks';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
    get length() {
      return Object.keys(store).length;
    },
  };
})();

beforeAll(() => {
  Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });
});

beforeEach(() => {
  localStorageMock.clear();
  // suppress console.error in tests
  jest.spyOn(console, 'error').mockImplementation();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('WorkflowConfigService', () => {
  describe('save', () => {
    it('should save workflow configuration with metadata', () => {
      const issues = createProcessedIssues();
      const result = WorkflowConfigService.save('123', '30', TEST_WORKFLOW, 'Test Board', 'scrum', issues);

      expect(result).toBe(true);

      // Verify it's in localStorage
      const saved = localStorage.getItem('workflow:board:123');
      expect(saved).toBeDefined();

      const savedData = JSON.parse(saved!);
      expect(savedData.metadata.boardId).toBe('123');
      expect(savedData.metadata.boardName).toBe('Test Board');
      expect(savedData.metadata.periodDays).toBe('30');
      expect(savedData.metadata.lastFetched).toBeDefined();
      expect(savedData.workflow).toEqual(TEST_WORKFLOW);
      expect(savedData.processedIssues.length).toBe(5);
    });

    it('should save without board name', () => {
      const result = WorkflowConfigService.save('123', '30', TEST_WORKFLOW);

      expect(result).toBe(true);

      const saved = localStorage.getItem('workflow:board:123');
      const savedData = JSON.parse(saved!);
      expect(savedData.metadata.boardName).toBeUndefined();
    });
  });

  describe('load', () => {
    it('should load workflow configuration', () => {
      WorkflowConfigService.save('123', '30', TEST_WORKFLOW, 'Test Board');

      const result = WorkflowConfigService.load('123');

      expect(result).toEqual(TEST_WORKFLOW);
    });

    it('should load issues from workflow configuration', () => {
      const issues = createProcessedIssues();
      WorkflowConfigService.save('123', '30', TEST_WORKFLOW, 'Test Board', 'scrum', issues);

      const result = WorkflowConfigService.loadWithMetadata('123');

      expect(result?.processedIssues).toBeDefined;
      expect(result?.processedIssues?.length).toBe(5);
    });

    it('should return null if config not found', () => {
      const result = WorkflowConfigService.load('999');

      expect(result).toBeNull();
    });

    it('should return null on invalid JSON', () => {
      localStorage.setItem('workflow:board:123', 'invalid json');

      const result = WorkflowConfigService.load('123');

      expect(result).toBeNull();
    });
  });

  describe('loadWithMetadata', () => {
    it('should load full config with metadata', () => {
      WorkflowConfigService.save('123', '30', TEST_WORKFLOW, 'Test Board', 'scrum');

      const result = WorkflowConfigService.loadWithMetadata('123');

      expect(result).toBeDefined();
      expect(result?.metadata.boardId).toBe('123');
      expect(result?.metadata.boardName).toBe('Test Board');
      expect(result?.metadata.boardType).toBe('scrum');
      expect(result?.workflow).toEqual(TEST_WORKFLOW);
    });

    it('should return null if config not found', () => {
      const result = WorkflowConfigService.loadWithMetadata('999');

      expect(result).toBeNull();
    });
  });

  describe('listAll', () => {
    it('should list all workflow configurations', () => {
      WorkflowConfigService.save('123', '30', TEST_WORKFLOW, 'Board 1');

      // Wait a tiny bit to ensure different timestamps
      const later = new Date(Date.now() + 1000).toISOString();
      localStorage.setItem('workflow:board:456', JSON.stringify({
        metadata: { boardId: '456', periodDays: 30, boardName: 'Board 2', lastFetched: later },
        workflow: TEST_WORKFLOW,
      }));

      const result = WorkflowConfigService.listAll();

      expect(result).toHaveLength(2);
      // Should be sorted by lastModified descending
      expect(result[0].metadata.boardId).toBe('456');
      expect(result[1].metadata.boardId).toBe('123');
    });

    it('should return empty array if no configs found', () => {
      const result = WorkflowConfigService.listAll();

      expect(result).toEqual([]);
    });

    it('should ignore non-workflow keys', () => {
      localStorage.setItem('other:key', 'some data');
      WorkflowConfigService.save('123', '30', TEST_WORKFLOW);

      const result = WorkflowConfigService.listAll();

      expect(result).toHaveLength(1);
    });

    it('should skip invalid JSON entries', () => {
      WorkflowConfigService.save('123', '30', TEST_WORKFLOW);
      localStorage.setItem('workflow:board:456', 'invalid json');

      const result = WorkflowConfigService.listAll();

      expect(result).toHaveLength(1);
      expect(result[0].metadata.boardId).toBe('123');
    });
  });

  describe('delete', () => {
    it('should delete workflow configuration', () => {
      WorkflowConfigService.save('123', '30', TEST_WORKFLOW);

      const result = WorkflowConfigService.delete('123');

      expect(result).toBe(true);
      expect(localStorage.getItem('workflow:board:123')).toBeNull();
    });

    it('should return true even if config does not exist', () => {
      const result = WorkflowConfigService.delete('999');

      expect(result).toBe(true);
    });
  });

  describe('exists', () => {
    it('should return true if config exists', () => {
      WorkflowConfigService.save('123', '30', TEST_WORKFLOW);

      const result = WorkflowConfigService.exists('123');

      expect(result).toBe(true);
    });

    it('should return false if config does not exist', () => {
      const result = WorkflowConfigService.exists('999');

      expect(result).toBe(false);
    });
  });
});
