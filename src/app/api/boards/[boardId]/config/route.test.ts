// src/app/api/boards/[boardId]/config/route.test.ts

import { NextRequest } from 'next/server';
import { GET, PUT, DELETE } from './route';
import { BoardConfigMockRepository } from '@/lib/repositories/board-config.mock.repository';
import { setBoardConfigRepository, resetBoardConfigRepository } from '@/lib/repositories';
import type { WorkflowDefinition } from '@/lib/jira/workflow-config';

const TEST_WORKFLOW: WorkflowDefinition = {
  key: 'test',
  name: 'Test Workflow',
  stages: [
    { key: 'backlog', name: 'Backlog', jiraStatuses: ['New'], stageType: 'new' },
    { key: 'dev', name: 'Development', jiraStatuses: ['In Progress'], stageType: 'in-progress', isCycleStart: true },
    { key: 'done', name: 'Done', jiraStatuses: ['Done'], stageType: 'done', isCycleEnd: true },
  ],
};

function createMockRequest(method: string, body?: object): NextRequest {
  const url = 'http://localhost:3000/api/boards/123/config';
  const init: RequestInit = { method };
  
  if (body) {
    init.body = JSON.stringify(body);
    init.headers = { 'Content-Type': 'application/json' };
  }
  
  // Cast to bypass strict type checking for test utility
  return new NextRequest(url, init as ConstructorParameters<typeof NextRequest>[1]);
}

function createParams(boardId: string) {
  return { params: Promise.resolve({ boardId }) };
}

describe('Board Config API Routes', () => {
  let mockRepository: BoardConfigMockRepository;

  beforeEach(() => {
    mockRepository = new BoardConfigMockRepository();
    setBoardConfigRepository(mockRepository);
  });

  afterEach(() => {
    resetBoardConfigRepository();
  });

  describe('GET /api/boards/[boardId]/config', () => {
    it('should return 404 for non-existent board', async () => {
      const request = createMockRequest('GET');
      const response = await GET(request, createParams('999'));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('not found');
    });

    it('should return board config for existing board', async () => {
      // First save a config
      await mockRepository.save({
        boardId: '123',
        periodDays: 30,
        workflow: TEST_WORKFLOW,
        boardName: 'Test Board',
      });

      const request = createMockRequest('GET');
      const response = await GET(request, createParams('123'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.metadata.boardId).toBe('123');
      expect(data.data.metadata.boardName).toBe('Test Board');
    });
  });

  describe('PUT /api/boards/[boardId]/config', () => {
    it('should return 400 if periodDays is missing', async () => {
      const request = createMockRequest('PUT', {
        workflow: TEST_WORKFLOW,
      });
      const response = await PUT(request, createParams('123'));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 400 if workflow is missing', async () => {
      const request = createMockRequest('PUT', {
        periodDays: 30,
      });
      const response = await PUT(request, createParams('123'));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should create new board config', async () => {
      const request = createMockRequest('PUT', {
        periodDays: 30,
        workflow: TEST_WORKFLOW,
        boardName: 'New Board',
        boardType: 'kanban',
      });
      const response = await PUT(request, createParams('123'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.metadata.boardId).toBe('123');
      expect(data.data.metadata.boardName).toBe('New Board');
      expect(data.data.metadata.boardType).toBe('kanban');
    });

    it('should update existing board config', async () => {
      // First create
      await mockRepository.save({
        boardId: '123',
        periodDays: 30,
        workflow: TEST_WORKFLOW,
        boardName: 'Original Name',
      });

      // Then update
      const request = createMockRequest('PUT', {
        periodDays: 60,
        workflow: TEST_WORKFLOW,
        boardName: 'Updated Name',
      });
      const response = await PUT(request, createParams('123'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.metadata.boardName).toBe('Updated Name');
      expect(data.data.metadata.periodDays).toBe(60);
    });
  });

  describe('DELETE /api/boards/[boardId]/config', () => {
    it('should delete existing board config', async () => {
      await mockRepository.save({
        boardId: '123',
        periodDays: 30,
        workflow: TEST_WORKFLOW,
      });

      const request = createMockRequest('DELETE');
      const response = await DELETE(request, createParams('123'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.deleted).toBe(true);

      // Verify it's deleted
      const exists = await mockRepository.exists('123');
      expect(exists.success && exists.data).toBe(false);
    });

    it('should return success even for non-existent board', async () => {
      const request = createMockRequest('DELETE');
      const response = await DELETE(request, createParams('999'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.deleted).toBe(false);
    });
  });
});
