// src/app/api/jira/board/route.test.ts

import { GET, POST } from './route';
import { JiraClient } from '@/lib/jira/client';

import { createMockRequest } from '@/lib/testutils/create-mocks';

// Mock the JiraClient class
jest.mock('@/lib/jira/jira-server-client');

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = {
    ...originalEnv,
    JIRA_INSTANCE_TYPE: 'server',
    JIRA_BASE_URL: 'https://jira.example.com',
    JIRA_PERSONAL_ACCESS_TOKEN: 'test-token-123'
  };
  const mockGetBoardConfiguration = jest.fn().mockResolvedValue(MOCK_BOARD_CONFIG);
  (JiraClient as jest.MockedClass<typeof JiraClient>).mockReset();
  (JiraClient as jest.MockedClass<typeof JiraClient>).mockImplementation(() => ({
    getBoardConfiguration: mockGetBoardConfiguration,
  }) as any);

  //suppress console.error during tests
  jest.spyOn(console, 'error').mockImplementation();
});

afterEach(() => {
  process.env = originalEnv;
  jest.restoreAllMocks(); // restore console.error
});

const baseUrl = 'http://localhost/api/jira/board';

const MOCK_BOARD_CONFIG = {
  id: 123,
  name: 'Engineering Board',
  type: 'scrum',
  columnConfig: {
    columns: [
      {
        name: 'To Do',
        statuses: [
          { id: '1' },
          { id: '2' },
        ],
      },
      {
        name: 'In Progress',
        statuses: [
          { id: '3' },
          { id: '4' },
        ],
      },
      {
        name: 'Done',
        statuses: [
          { id: '5' },
        ],
      },
    ],
  },
};

describe('Board Info API Route', () => {

  describe('GET /api/jira/board', () => {
    it('should return error if boardId is missing', async () => {
      const request = createMockRequest(baseUrl, {});

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('boardId is required');
    });

    it('should return error if JIRA_BASE_URL is missing', async () => {
      delete process.env.JIRA_BASE_URL;

      const request = createMockRequest(baseUrl, { boardId: '123' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('JIRA_BASE_URL environment variable is required');
    });

    it('should return error if JIRA_PERSONAL_ACCESS_TOKEN is missing', async () => {
      delete process.env.JIRA_PERSONAL_ACCESS_TOKEN;

      const request = createMockRequest(baseUrl, { boardId: '123' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('JIRA_PERSONAL_ACCESS_TOKEN environment variable is required for Jira Server');
    });

    it('should fetch board config and return column info without status names', async () => {
      const mockGetBoardConfiguration = jest.fn().mockResolvedValue(MOCK_BOARD_CONFIG);

      (JiraClient as jest.MockedClass<typeof JiraClient>).mockImplementation(() => {
        return {
          getBoardConfiguration: mockGetBoardConfiguration,
        } as any;
      });

      const request = createMockRequest(baseUrl, { boardId: '123' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.board).toEqual({
        id: '123',
        name: 'Engineering Board',
        type: 'scrum',
      });

      // Should return column info with status counts
      expect(data.data.columns).toEqual([
        { name: 'To Do', statusCount: 2 },
        { name: 'In Progress', statusCount: 2 },
        { name: 'Done', statusCount: 1 },
      ]);

      // Should include helpful message
      expect(data.data.message).toContain('manually add status names');

      // Verify method was called
      expect(mockGetBoardConfiguration).toHaveBeenCalledWith('123');
    });

    it('should handle board configuration without columns', async () => {
      const mockGetBoardConfiguration = jest.fn().mockResolvedValue({
        id: 123,
        name: 'Engineering Board',
        type: 'scrum',
        columnConfig: null,
      });

      (JiraClient as jest.MockedClass<typeof JiraClient>).mockImplementation(() => {
        return {
          getBoardConfiguration: mockGetBoardConfiguration,
        } as any;
      });

      const request = createMockRequest(baseUrl, { boardId: '123' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.columns).toEqual([]);
    });

    it('should handle JiraApiError with correct status', async () => {
      const jiraError = {
        name: 'JiraApiError',
        message: 'Board not found',
        status: 404,
        response: { errorMessages: ['Board does not exist'] },
      };

      const mockGetBoardConfiguration = jest.fn().mockRejectedValue(jiraError);

      (JiraClient as jest.MockedClass<typeof JiraClient>).mockImplementation(() => {
        return {
          getBoardConfiguration: mockGetBoardConfiguration,
        } as any;
      });

      const request = createMockRequest(baseUrl, { boardId: '999' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Board not found');
    });

    it('should handle generic errors', async () => {
      const mockGetBoardConfiguration = jest.fn().mockRejectedValue(new Error('Network timeout'));

      (JiraClient as jest.MockedClass<typeof JiraClient>).mockImplementation(() => {
        return {
          getBoardConfiguration: mockGetBoardConfiguration,
        } as any;
      });

      const request = createMockRequest(baseUrl, { boardId: '123' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Network timeout');
    });

    it('should calculate status counts correctly', async () => {
      const configWithVaryingCounts = {
        ...MOCK_BOARD_CONFIG,
        columnConfig: {
          columns: [
            {
              name: 'Column 1',
              statuses: [{ id: '1' }], // 1 status
            },
            {
              name: 'Column 2',
              statuses: [{ id: '2' }, { id: '3' }, { id: '4' }], // 3 statuses
            },
            {
              name: 'Column 3',
              statuses: [], // 0 statuses
            },
          ],
        },
      };

      const mockGetBoardConfiguration = jest.fn().mockResolvedValue(configWithVaryingCounts);

      (JiraClient as jest.MockedClass<typeof JiraClient>).mockImplementation(() => {
        return {
          getBoardConfiguration: mockGetBoardConfiguration,
        } as any;
      });

      const request = createMockRequest(baseUrl, { boardId: '123' });

      const response = await GET(request);
      const data = await response.json();

      expect(data.data.columns).toEqual([
        { name: 'Column 1', statusCount: 1 },
        { name: 'Column 2', statusCount: 3 },
        { name: 'Column 3', statusCount: 0 },
      ]);
    });
  });

  describe('POST /api/jira/board', () => {
    const MOCK_CONFIG = {
      instanceType: 'server',
      baseUrl: 'https://jira.example.com',
      bearerToken: 'test-token-123',
    };

    function createPostRequest(body: any) {
      const normalized: any = { ...body };
      if (normalized.config !== undefined) {
        // ensure config is sent as a string, even if caller passes an object
        normalized.config =
          typeof normalized.config === 'string'
            ? normalized.config
            : JSON.stringify(normalized.config);
      }

      return {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(normalized),
        // mimic NextRequest.json() to return the parsed body
        json: async () => normalized,
      } as any;
    }

    it('should return error if boardId is missing', async () => {
      const request = createPostRequest({ config: MOCK_CONFIG });
      const response = await POST(request);
      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('boardId is required');
    });

    it('should use environment config when request config is missing', async () => {
      const request = createPostRequest({ boardId: '123' });
      const response = await POST(request);
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should fetch board config and return column info without status names', async () => {
      const mockGetBoardConfiguration = jest.fn().mockResolvedValue(MOCK_BOARD_CONFIG);
      (JiraClient as jest.MockedClass<typeof JiraClient>).mockImplementation(() => {
        return {
          getBoardConfiguration: mockGetBoardConfiguration,
        } as any;
      });
      const request = createPostRequest({ boardId: '123', config: MOCK_CONFIG });
      const response = await POST(request);
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.board).toEqual({
        id: '123',
        name: 'Engineering Board',
        type: 'scrum',
      });
      expect(data.data.columns).toEqual([
        { name: 'To Do', statusCount: 2 },
        { name: 'In Progress', statusCount: 2 },
        { name: 'Done', statusCount: 1 },
      ]);
      expect(data.data.message).toContain('manually add status names');
      expect(mockGetBoardConfiguration).toHaveBeenCalledWith('123');
    });

    it('should handle board configuration without columns', async () => {
      const mockGetBoardConfiguration = jest.fn().mockResolvedValue({
        id: 123,
        name: 'Engineering Board',
        type: 'scrum',
        columnConfig: null,
      });
      (JiraClient as jest.MockedClass<typeof JiraClient>).mockImplementation(() => {
        return {
          getBoardConfiguration: mockGetBoardConfiguration,
        } as any;
      });
      const request = createPostRequest({ boardId: '123', config: MOCK_CONFIG });
      const response = await POST(request);
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.columns).toEqual([]);
    });

    it('should handle JiraApiError with correct status', async () => {
      const jiraError = {
        name: 'JiraApiError',
        message: 'Board not found',
        status: 404,
        response: { errorMessages: ['Board does not exist'] },
      };
      const mockGetBoardConfiguration = jest.fn().mockRejectedValue(jiraError);
      (JiraClient as jest.MockedClass<typeof JiraClient>).mockImplementation(() => {
        return {
          getBoardConfiguration: mockGetBoardConfiguration,
        } as any;
      });
      const request = createPostRequest({ boardId: '999', config: MOCK_CONFIG });
      const response = await POST(request);
      const data = await response.json();
      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Board not found');
    });

    it('should handle generic errors', async () => {
      const mockGetBoardConfiguration = jest.fn().mockRejectedValue(new Error('Network timeout'));
      (JiraClient as jest.MockedClass<typeof JiraClient>).mockImplementation(() => {
        return {
          getBoardConfiguration: mockGetBoardConfiguration,
        } as any;
      });
      const request = createPostRequest({ boardId: '123', config: MOCK_CONFIG });
      const response = await POST(request);
      const data = await response.json();
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Network timeout');
    });

    it('should calculate status counts correctly', async () => {
      const configWithVaryingCounts = {
        ...MOCK_BOARD_CONFIG,
        columnConfig: {
          columns: [
            {
              name: 'Column 1',
              statuses: [{ id: '1' }], // 1 status
            },
            {
              name: 'Column 2',
              statuses: [{ id: '2' }, { id: '3' }, { id: '4' }], // 3 statuses
            },
            {
              name: 'Column 3',
              statuses: [], // 0 statuses
            },
          ],
        },
      };
      const mockGetBoardConfiguration = jest.fn().mockResolvedValue(configWithVaryingCounts);
      (JiraClient as jest.MockedClass<typeof JiraClient>).mockImplementation(() => {
        return {
          getBoardConfiguration: mockGetBoardConfiguration,
        } as any;
      });
      const request = createPostRequest({ boardId: '123', config: MOCK_CONFIG });
      const response = await POST(request);
      const data = await response.json();
      expect(data.data.columns).toEqual([
        { name: 'Column 1', statusCount: 1 },
        { name: 'Column 2', statusCount: 3 },
        { name: 'Column 3', statusCount: 0 },
      ]);
    });
  });
});
