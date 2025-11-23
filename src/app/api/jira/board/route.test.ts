// src/app/api/jira/board/route.test.ts

import { NextRequest } from 'next/server';
import { GET } from './route';
import { JiraClient } from '@/lib/jira/client';
import { JiraBoardConfigResponse } from '@/lib/jira/jira-types';

// Mock the JiraClient class
jest.mock('@/lib/jira/client');

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = {
    ...originalEnv,
    JIRA_BASE_URL: 'https://jira.example.com',
    JIRA_PERSONAL_ACCESS_TOKEN: 'test-token-123'
  };
  jest.clearAllMocks();
});

afterEach(() => {
  process.env = originalEnv;
});

// Helper to create mock NextRequest
function createMockRequest(searchParams: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/jira/board');
  Object.entries(searchParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return new NextRequest(url);
}

const MOCK_BOARD_CONFIG: JiraBoardConfigResponse = {
  id: '123',
  name: 'Engineering Board',
  type: 'scrum',
  columnConfig: {
    columns: [
      {
        name: 'To Do',
        statuses: [
          { id: '1' }, // Note: no name in config, we fetch it separately
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

// Mock status responses (from /rest/api/latest/status/{id})
const MOCK_STATUSES: Record<string, { id: string; name: string }> = {
  '1': { id: '1', name: 'Backlog' },
  '2': { id: '2', name: 'To Do' },
  '3': { id: '3', name: 'In Progress' },
  '4': { id: '4', name: 'In Review' },
  '5': { id: '5', name: 'Done' },
};

describe('Board Info API Route', () => {
  describe('GET /api/jira/board', () => {
    it('should return error if boardId is missing', async () => {
      const request = createMockRequest({});

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('boardId is required');
    });

    it('should return error if JIRA_BASE_URL is missing', async () => {
      delete process.env.JIRA_BASE_URL;

      const request = createMockRequest({ boardId: '123' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Missing Jira configuration');
    });

    it('should return error if JIRA_PERSONAL_ACCESS_TOKEN is missing', async () => {
      delete process.env.JIRA_PERSONAL_ACCESS_TOKEN;

      const request = createMockRequest({ boardId: '123' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Missing Jira configuration');
    });

    it('should fetch board config and status names', async () => {
      const mockGetBoardConfiguration = jest.fn().mockResolvedValue(MOCK_BOARD_CONFIG);
      const mockGetStatus = jest.fn().mockImplementation((statusId: string) => {
        return Promise.resolve(MOCK_STATUSES[statusId]);
      });

      (JiraClient as jest.MockedClass<typeof JiraClient>).mockImplementation(() => {
        return {
          getBoardConfiguration: mockGetBoardConfiguration,
          getStatus: mockGetStatus,
        } as any;
      });

      const request = createMockRequest({ boardId: '123' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.board).toEqual({
        id: '123',
        name: 'Engineering Board',
        type: 'scrum',
      });

      // Should fetch status names for all status IDs and sort alphabetically
      expect(data.data.statuses).toEqual([
        'Backlog',
        'Done',
        'In Progress',
        'In Review',
        'To Do',
      ]);

      expect(data.data.columns).toHaveLength(3);

      // Verify methods were called
      expect(mockGetBoardConfiguration).toHaveBeenCalledWith('123');
      expect(mockGetStatus).toHaveBeenCalledTimes(5); // 5 unique status IDs
      expect(mockGetStatus).toHaveBeenCalledWith('1');
      expect(mockGetStatus).toHaveBeenCalledWith('2');
      expect(mockGetStatus).toHaveBeenCalledWith('3');
      expect(mockGetStatus).toHaveBeenCalledWith('4');
      expect(mockGetStatus).toHaveBeenCalledWith('5');
    });

    it('should handle board configuration without columns', async () => {
      const mockGetBoardConfiguration = jest.fn().mockResolvedValue({
        id: 123,
        name: 'Engineering Board',
        type: 'scrum',
        columnConfig: null, // No columns
      });
      const mockGetStatus = jest.fn();

      (JiraClient as jest.MockedClass<typeof JiraClient>).mockImplementation(() => {
        return {
          getBoardConfiguration: mockGetBoardConfiguration,
          getStatus: mockGetStatus,
        } as any;
      });

      const request = createMockRequest({ boardId: '123' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.statuses).toEqual([]);
      expect(data.data.columns).toEqual([]);
      expect(mockGetStatus).not.toHaveBeenCalled(); // No statuses to fetch
    });

    it('should handle failed status fetch gracefully', async () => {
      const mockGetBoardConfiguration = jest.fn().mockResolvedValue(MOCK_BOARD_CONFIG);
      const mockGetStatus = jest.fn().mockImplementation((statusId: string) => {
        if (statusId === '3') {
          // Simulate failure for one status
          return Promise.reject(new Error('Status not found'));
        }
        return Promise.resolve(MOCK_STATUSES[statusId]);
      });

      (JiraClient as jest.MockedClass<typeof JiraClient>).mockImplementation(() => {
        return {
          getBoardConfiguration: mockGetBoardConfiguration,
          getStatus: mockGetStatus,
        } as any;
      });

      const request = createMockRequest({ boardId: '123' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Should exclude the failed status but include others
      expect(data.data.statuses).toEqual([
        'Backlog',
        'Done',
        'In Review',
        'To Do',
      ]);
      expect(data.data.statuses).not.toContain('In Progress'); // ID '3' failed
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

      const request = createMockRequest({ boardId: '999' });

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

      const request = createMockRequest({ boardId: '123' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Network timeout');
    });

    it('should deduplicate status IDs before fetching', async () => {
      const configWithDuplicates = {
        ...MOCK_BOARD_CONFIG,
        columnConfig: {
          columns: [
            {
              name: 'Column 1',
              statuses: [{ id: '1' }],
            },
            {
              name: 'Column 2',
              statuses: [
                { id: '1' }, // Duplicate ID
                { id: '2' },
              ],
            },
          ],
        },
      };

      const mockGetBoardConfiguration = jest.fn().mockResolvedValue(configWithDuplicates);
      const mockGetStatus = jest.fn().mockImplementation((statusId: string) => {
        return Promise.resolve(MOCK_STATUSES[statusId]);
      });

      (JiraClient as jest.MockedClass<typeof JiraClient>).mockImplementation(() => {
        return {
          getBoardConfiguration: mockGetBoardConfiguration,
          getStatus: mockGetStatus,
        } as any;
      });

      const request = createMockRequest({ boardId: '123' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);

      // Should only fetch each status ID once
      expect(mockGetStatus).toHaveBeenCalledTimes(2); // IDs '1' and '2'
      expect(mockGetStatus).toHaveBeenCalledWith('1');
      expect(mockGetStatus).toHaveBeenCalledWith('2');

      // Result should have 2 unique status names
      expect(data.data.statuses).toEqual(['Backlog', 'To Do']);
    });

    it('should sort status names alphabetically', async () => {
      const mockStatuses: Record<string, { id: string; name: string }> = {
        '1': { id: '1', name: 'Zebra' },
        '2': { id: '2', name: 'Apple' },
        '3': { id: '3', name: 'Mango' },
      };

      const configWithUnsortedStatuses = {
        id: 123,
        name: 'Test Board',
        columnConfig: {
          columns: [
            {
              name: 'Column',
              statuses: [
                { id: '1' },
                { id: '2' },
                { id: '3' },
              ],
            },
          ],
        },
      };

      const mockGetBoardConfiguration = jest.fn().mockResolvedValue(configWithUnsortedStatuses);
      const mockGetStatus = jest.fn().mockImplementation((statusId: string) => {
        return Promise.resolve(mockStatuses[statusId]);
      });

      (JiraClient as jest.MockedClass<typeof JiraClient>).mockImplementation(() => {
        return {
          getBoardConfiguration: mockGetBoardConfiguration,
          getStatus: mockGetStatus,
        } as any;
      });

      const request = createMockRequest({ boardId: '123' });

      const response = await GET(request);
      const data = await response.json();

      expect(data.data.statuses).toEqual(['Apple', 'Mango', 'Zebra']);
    });
  });
});