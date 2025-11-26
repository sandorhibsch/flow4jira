import { NextRequest } from "next/server";
import { DELETE, GET, POST } from "./route";
import { WorkflowConfigService } from "@/lib/services/workflow-config-service";
import { WorkflowDefinition } from "@/lib/jira/workflow-config";
import { TEST_WORKFLOW, createMockRequest } from "@/lib/testutils/create-mocks";

jest.mock('@/lib/services/workflow-config-service');

const mockWorkflowService = WorkflowConfigService as jest.Mocked<typeof WorkflowConfigService>;

const baseUrl = 'http://localhost/api/workflow/config';

const TEST_CONFIG_WITH_METADATA = {
  metadata: {
    boardId: '123',
    boardName: 'Test Board',
    lastModified: '2024-01-01T00:00:00.000Z',
  },
  workflow: TEST_WORKFLOW,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Workflow config CRUD operations', () => {
  describe('Get board config', () => {
    it('should return error if boardId is missing', async () => {
      const request = createMockRequest(baseUrl, {});

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Board ID');
      expect(mockWorkflowService.loadWithMetadata).not.toHaveBeenCalled();
    });

    it('should return error if boardId doesnt exist', async () => {
      const mockResolvedValue = mockWorkflowService.loadWithMetadata.mockReturnValue(null);

      const request = createMockRequest(baseUrl, { boardId: '999' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Configuration not found');

    });

    it('should return board config for board ID', async () => {
      const mockConfig = mockWorkflowService.loadWithMetadata.mockReturnValue(TEST_CONFIG_WITH_METADATA);

      const request = createMockRequest(baseUrl, { boardId: '123' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(TEST_CONFIG_WITH_METADATA);
    });
  });

  describe('Create board config', () => {
    it('should save and return new board config', async () => {
      mockWorkflowService.save.mockReturnValue(true);

      const request = createMockRequest(baseUrl, {}, {
        boardId: '123',
        workflow: TEST_WORKFLOW,
        boardName: 'Test Board',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('saved successfully');
      expect(mockWorkflowService.save).toHaveBeenCalledWith(
        '123',
        TEST_WORKFLOW,
        'Test Board'
      );
    });

    it('should throw error if board ID is missing', async () => {
      const request = createMockRequest(baseUrl, {}, {
        workflow: TEST_WORKFLOW
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Board ID is required');

    });

    it('should throw error if workflow is missing', async () => {
      const request = createMockRequest(baseUrl, {}, {
        boardId: '123'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Workflow is required');

    });

    it('should throw error if workflow is invalid', async () => {
      const BAD_WORKFLOW = {}
      const request = createMockRequest(baseUrl, {}, {
        boardId: '123',
        workflow: BAD_WORKFLOW,
        boardName: 'This is not a board'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid workflow structure');

    });

    it('should throw error if save fails', async () => {
      mockWorkflowService.save.mockReturnValue(false);

      const request = createMockRequest(baseUrl, {}, {
        boardId: '123',
        workflow: TEST_WORKFLOW,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Failed to save');
    });
  });

  describe('Update board config', () => {
    it('should save and return updated board config', async () => {
      mockWorkflowService.save.mockReturnValue(true);

      const updatedWorkflow: WorkflowDefinition = {
        ...TEST_WORKFLOW,
        name: 'Updated workflow name'
      }
      const request = createMockRequest(baseUrl, {}, {
        boardId: '123',
        workflow: updatedWorkflow,
        boardName: 'Test Board'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('saved successfully');
      expect(mockWorkflowService.save).toHaveBeenCalledWith(
        '123',
        updatedWorkflow,
        'Test Board'
      );
    });
  });

  describe('Delete board config', () => {
    it('should delete board config', async () => {
      mockWorkflowService.delete.mockReturnValue(true);

      const request = createMockRequest(baseUrl, { boardId: '123' });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('deleted successfully');
      expect(mockWorkflowService.delete).toHaveBeenCalledWith('123');
    });

    it('should throw error if boardId is missing', async () => {
      const request = createMockRequest(baseUrl, {});

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Board ID is required');
      expect(mockWorkflowService.delete).not.toHaveBeenCalled();

    });
    it('should throw error if boardId doesnt exist', async () => {
      mockWorkflowService.delete.mockReturnValue(false);

      const request = createMockRequest(baseUrl, { boardId: '123 ' });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Failed to delete');

    });
  });

});