// src/app/api/flow/board/route.test.ts

import { GET } from './route';
import { handleFlowRequest } from '@/lib/api/flow-handler';

import { createMockRequest, mockJiraIssue } from '@/lib/testutils/create-mocks';

// Mock the dependencies
jest.mock('@/lib/jira/client');
jest.mock('@/lib/api/flow-handler');

// Mock environment variables - not needed anymore since handler checks them
const mockHandleFlowRequest = handleFlowRequest as jest.MockedFunction<typeof handleFlowRequest>;

beforeEach(() => {
  jest.clearAllMocks();
});

const baseUrl = 'http://localhost/api/flow/issues';

describe('Issues Flow API Route', () => {
  describe('Validation', () => {

    it('should default jql to updated>=-1d if not provided', async () => {
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
        'JQL: updated>=-1d'
      );
    });

    it('should pass jql to handler correctly', async () => {
      mockHandleFlowRequest.mockResolvedValue({
        success: true,
        data: {
          issues: [],
        },
        metadata: { timestamp: new Date().toISOString() },
        status: 200
      });

      const request = createMockRequest(baseUrl, { boardId: '456', periodDays: '60' });

      await GET(request);

      expect(mockHandleFlowRequest).toHaveBeenCalledWith(
        expect.any(Function),
        'JQL: updated>=-1d'
      );
    });
  });

  describe('Handler Integration', () => {
    it('should return success response from handler', async () => {
      const mockData = { issues: [mockJiraIssue] };

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
      expect(data.details).toBeDefined();
    });
  });
});