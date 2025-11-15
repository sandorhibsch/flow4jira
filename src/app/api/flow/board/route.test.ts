// src/app/api/flow/board/route.test.ts

import { NextRequest } from 'next/server';
import { GET } from './route';
import { handleFlowRequest } from '@/lib/api/flow-handler';

// Mock the dependencies
jest.mock('@/lib/jira/client');
jest.mock('@/lib/api/flow-handler');

// Mock environment variables - not needed anymore since handler checks them
const mockHandleFlowRequest = handleFlowRequest as jest.MockedFunction<typeof handleFlowRequest>;

beforeEach(() => {
  jest.clearAllMocks();
});

// Helper to create mock NextRequest
function createMockRequest(searchParams: Record<string, string>): NextRequest {
  const url = new URL('http://localhost/api/flow/board');
  Object.entries(searchParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return new NextRequest(url);
}

describe('Board Flow API Route', () => {
  describe('Validation', () => {
    it('should return 400 if boardId is missing', async () => {
      const request = createMockRequest({ periodDays: '30' });

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
          workflow: {} as any
        },
        metadata: { timestamp: new Date().toISOString() },
        status: 200
      });

      const request = createMockRequest({ boardId: '123' });

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
          issues: [],
          workflow: {} as any,
        },
        metadata: { timestamp: new Date().toISOString() },
        status: 200
      });

      const request = createMockRequest({ boardId: '456', periodDays: '60' });

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
        issues: [{ key: 'PROJ-1', summary: 'Test' }],
        workflow: {} as any,
      };

      mockHandleFlowRequest.mockResolvedValue({
        success: true,
        data: mockData,
        metadata: { timestamp: '2024-01-01T00:00:00.000Z', query: 'Board 123, last 30 days' },
        status: 200
      });

      const request = createMockRequest({ boardId: '123', periodDays: '30' });

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

      const request = createMockRequest({ boardId: '999', periodDays: '30' });

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

      const request = createMockRequest({ boardId: '123', periodDays: '30' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Unauthorized');
      expect(data.details).toBeDefined();
    });
  });
});