// src/app/api/flow/board/route.test.ts

import { GET, POST } from './route';
import { handleFlowRequest } from '@/lib/api/flow-handler';
import { createMockRequest, mockJiraIssue } from '@/lib/testutils/create-mocks';
import { NextRequest } from 'next/server';

// Mock the dependencies
jest.mock('@/lib/jira/client');
jest.mock('@/lib/api/flow-handler');

// Mock environment variables - not needed anymore since handler checks them
const mockHandleFlowRequest = handleFlowRequest as jest.MockedFunction<typeof handleFlowRequest>;

beforeEach(() => {
  jest.clearAllMocks();
});

const baseUrl = 'http://localhost/api/flow/board';

describe('Board Flow API Route', () => {
  describe('Validation', () => {
    it('should return 400 if boardId is missing', async () => {
      const request = createMockRequest(baseUrl, { periodDays: '30' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('board ID');
      expect(mockHandleFlowRequest).not.toHaveBeenCalled();
    });

    it('should default periodDays to 1 if not provided', async () => {
      mockHandleFlowRequest.mockResolvedValue({
        success: true,
        data: {
          issues: [],
        },
        metadata: { timestamp: new Date().toISOString() },
        status: 200
      });

      const request = createMockRequest(baseUrl, { boardId: '123' });

      await GET(request);

      // Verify the handler was called with a function that uses periodDays='1'
      expect(mockHandleFlowRequest).toHaveBeenCalledWith(
        expect.any(Function),
        'Board 123, last 1 days'
      );
    });

    it('should pass boardId and periodDays to handler correctly', async () => {
      mockHandleFlowRequest.mockResolvedValue({
        success: true,
        data: {
          issues: []
        },
        metadata: { timestamp: new Date().toISOString() },
        status: 200
      });

      const request = createMockRequest(baseUrl, { boardId: '456', periodDays: '60' });

      await GET(request);

      expect(mockHandleFlowRequest).toHaveBeenCalledWith(
        expect.any(Function),
        'Board 456, last 60 days'
      );
    });
  });

  describe('Handler Integration', () => {
    it('should return success response from handler', async () => {
      const mockData = {
        issues: [mockJiraIssue]
      };

      mockHandleFlowRequest.mockResolvedValue({
        success: true,
        data: mockData,
        metadata: { timestamp: '2024-01-01T00:00:00.000Z', query: 'Board 123, last 30 days' },
        status: 200
      });

      const request = createMockRequest(baseUrl, { boardId: '123', periodDays: '30' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockData);
      expect(data.metadata).toBeDefined();
    });

    it('should return error response from handler', async () => {
      mockHandleFlowRequest.mockResolvedValue({
        success: false,
        error: 'Board not found',
        status: 404
      });

      const request = createMockRequest(baseUrl, { boardId: '999', periodDays: '30' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Board not found');
    });

    it('should pass error details from handler', async () => {
      // Note: The handler deals with JiraApiError serialization internally,
      // so we just test that the route passes through the handler's response
      mockHandleFlowRequest.mockResolvedValue({
        success: false,
        error: 'Jira API Error: Unauthorized',
        details: { status: 401, response: 'Invalid token' },
        status: 401
      });

      const request = createMockRequest(baseUrl, { boardId: '123', periodDays: '30' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Unauthorized');
    });
  });

  describe('POST /api/flow/board', () => {
    const MOCK_CONFIG = {
      instanceType: 'server' as const,
      baseUrl: 'https://jira.example.com',
      bearerToken: 'test-token-123',
    };

    function createPostRequest(body: any) {
      return {
        json: jest.fn().mockResolvedValue(body),
      } as unknown as NextRequest;
    }

    it('should return error if boardId is missing', async () => {
      const request = createPostRequest({ config: MOCK_CONFIG });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('boardId is required');
      expect(mockHandleFlowRequest).not.toHaveBeenCalled();
    });

    it('should return error if config is missing', async () => {
      const request = createPostRequest({ boardId: '123' });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(mockHandleFlowRequest).toHaveBeenCalled();
    });

    it('should return error if config is invalid JSON', async () => {
      const request = createPostRequest({ boardId: '123', config: 'invalid json' });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid Jira config provided');
      expect(mockHandleFlowRequest).not.toHaveBeenCalled();
    });

    it('should fetch flow issues and return success response', async () => {
      const mockData = {
        issues: [mockJiraIssue]
      };

      mockHandleFlowRequest.mockResolvedValue({
        success: true,
        data: mockData,
        metadata: { timestamp: '2024-01-01T00:00:00.000Z', query: 'Board 123, last 30 days' },
        status: 200
      });

      const request = createPostRequest({
        boardId: '123',
        periodDays: '30',
        config: MOCK_CONFIG
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockData);
      expect(data.metadata).toBeDefined();
      expect(mockHandleFlowRequest).toHaveBeenCalledWith(
        expect.any(Function),
        'Board 123, last 30 days',
        MOCK_CONFIG
      );
    });

    it('should default periodDays to 1 if not provided', async () => {
      mockHandleFlowRequest.mockResolvedValue({
        success: true,
        data: { issues: [] },
        metadata: { timestamp: new Date().toISOString() },
        status: 200
      });

      const request = createPostRequest({
        boardId: '123',
        config: MOCK_CONFIG
      });

      await POST(request);

      expect(mockHandleFlowRequest).toHaveBeenCalledWith(
        expect.any(Function),
        'Board 123, last 1 days',
        MOCK_CONFIG
      );
    });

    it('should handle JiraApiError correctly', async () => {
      const jiraError = {
        name: 'JiraApiError',
        message: 'Board not found',
        status: 404,
        response: { errorMessages: ['Board does not exist'] },
      };

      mockHandleFlowRequest.mockResolvedValue({
        success: false,
        error: `Jira API Error: ${jiraError.message}`,
        details: { status: jiraError.status, response: jiraError.response },
        status: jiraError.status
      });

      const request = createPostRequest({
        boardId: '999',
        config: MOCK_CONFIG
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Board not found');
      expect(data.details).toBeDefined();
    });

    it('should handle generic errors', async () => {
      mockHandleFlowRequest.mockResolvedValue({
        success: false,
        error: 'Failed to fetch flow issues: Network timeout',
        status: 500
      });

      const request = createPostRequest({
        boardId: '123',
        config: MOCK_CONFIG
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Network timeout');
    });
  });
});
