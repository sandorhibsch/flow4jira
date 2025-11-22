// src/lib/jira/client.test.ts

import { JiraClient, JiraApiError } from './client';
import { JiraBoardConfigResponse, JiraSearchResponse, JiraStatusResponse } from './jira-types';

// Mock fetch globally
global.fetch = jest.fn();

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

beforeEach(() => {
  jest.clearAllMocks();
  // Reset console.log to avoid noise in tests
  jest.spyOn(console, 'log').mockImplementation();
});

afterEach(() => {
  jest.restoreAllMocks();
});

const TEST_CONFIG = {
  baseUrl: 'https://jira.example.com',
  bearerToken: 'test-token-123'
};

describe('JiraClient', () => {
  describe('Constructor', () => {
    it('should create client with config', () => {
      const client = new JiraClient(TEST_CONFIG);
      expect(client).toBeInstanceOf(JiraClient);
    });
  });

  describe('searchIssues', () => {
    it('should make request with correct URL and parameters', async () => {
      const mockResponse: JiraSearchResponse = {
        expand: '',
        startAt: 0,
        maxResults: 50,
        total: 1,
        issues: [{
          key: 'TEST-1',
          id: '1',
          self: 'https://jira.example.com/rest/api/2/issue/1',
          fields: {
            summary: 'Test issue',
            created: '2024-01-01T00:00:00.000Z',
            resolutiondate: null,
            issuetype: { id: '1', name: 'Story', iconUrl: '' },
            status: {
              id: '1',
              name: 'Open',
              statusCategory: { id: 1, key: 'new', colorName: 'blue', name: 'New' }
            }
          }
        }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const client = new JiraClient(TEST_CONFIG);
      const result = await client.searchIssues('project=TEST', 50, 'summary', 'changelog');

      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Debug: log what we're actually getting
      const fetchCall = mockFetch.mock.calls[0];
      console.log('Fetch called with:', fetchCall);
      console.log('First arg:', fetchCall[0]);
      console.log('First arg type:', typeof fetchCall[0]);

      // fetch is called with a string URL as first argument
      const callUrl = mockFetch.mock.calls[0][0] as string;
      console.log('Call URL:', callUrl);

      // fetch is called with a string URL as first argument

      expect(callUrl).toContain('/rest/api/latest/search');
      expect(callUrl).toContain('jql=project%3DTEST');
      expect(callUrl).toContain('maxResults=50');
      expect(callUrl).toContain('fields=summary');
      expect(callUrl).toContain('expand=changelog');
      expect(callUrl).toContain('startAt=0');

      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].key).toBe('TEST-1');
    });

    it('should handle pagination correctly without duplicates', async () => {
      // First page response
      const firstPageResponse: JiraSearchResponse = {
        expand: '',
        startAt: 0,
        maxResults: 2,
        total: 5,
        issues: [
          {
            key: 'TEST-1',
            id: '1',
            self: 'https://jira.example.com/rest/api/2/issue/1',
            fields: {
              summary: 'Issue 1',
              created: '2024-01-01T00:00:00.000Z',
              resolutiondate: null,
              issuetype: { id: '1', name: 'Story', iconUrl: '' },
              status: { id: '1', name: 'Open', statusCategory: { id: 1, key: 'new', colorName: 'blue', name: 'New' } }
            }
          },
          {
            key: 'TEST-2',
            id: '2',
            self: 'https://jira.example.com/rest/api/2/issue/2',
            fields: {
              summary: 'Issue 2',
              created: '2024-01-01T00:00:00.000Z',
              resolutiondate: null,
              issuetype: { id: '1', name: 'Story', iconUrl: '' },
              status: { id: '1', name: 'Open', statusCategory: { id: 1, key: 'new', colorName: 'blue', name: 'New' } }
            }
          }
        ]
      };

      // Second page response
      const secondPageResponse: JiraSearchResponse = {
        expand: '',
        startAt: 2,
        maxResults: 2,
        total: 5,
        issues: [
          {
            key: 'TEST-3',
            id: '3',
            self: 'https://jira.example.com/rest/api/2/issue/3',
            fields: {
              summary: 'Issue 3',
              created: '2024-01-01T00:00:00.000Z',
              resolutiondate: null,
              issuetype: { id: '1', name: 'Story', iconUrl: '' },
              status: { id: '1', name: 'Open', statusCategory: { id: 1, key: 'new', colorName: 'blue', name: 'New' } }
            }
          },
          {
            key: 'TEST-4',
            id: '4',
            self: 'https://jira.example.com/rest/api/2/issue/4',
            fields: {
              summary: 'Issue 4',
              created: '2024-01-01T00:00:00.000Z',
              resolutiondate: null,
              issuetype: { id: '1', name: 'Story', iconUrl: '' },
              status: { id: '1', name: 'Open', statusCategory: { id: 1, key: 'new', colorName: 'blue', name: 'New' } }
            }
          }
        ]
      };

      // Third page response
      const thirdPageResponse: JiraSearchResponse = {
        expand: '',
        startAt: 4,
        maxResults: 2,
        total: 5,
        issues: [
          {
            key: 'TEST-5',
            id: '5',
            self: 'https://jira.example.com/rest/api/2/issue/5',
            fields: {
              summary: 'Issue 5',
              created: '2024-01-01T00:00:00.000Z',
              resolutiondate: null,
              issuetype: { id: '1', name: 'Story', iconUrl: '' },
              status: { id: '1', name: 'Open', statusCategory: { id: 1, key: 'new', colorName: 'blue', name: 'New' } }
            }
          }
        ]
      };

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => firstPageResponse } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => secondPageResponse } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => thirdPageResponse } as Response);

      const client = new JiraClient(TEST_CONFIG);
      const result = await client.searchIssues('project=TEST', 2, 'summary', 'changelog');

      // Should make 3 requests (0-1, 2-3, 4)
      expect(mockFetch).toHaveBeenCalledTimes(3);

      // Check that each request has the correct startAt parameter
      const firstCallUrl = mockFetch.mock.calls[0][0] as string;
      const secondCallUrl = mockFetch.mock.calls[1][0] as string;
      const thirdCallUrl = mockFetch.mock.calls[2][0] as string;

      expect(firstCallUrl).toContain('startAt=0');
      expect(secondCallUrl).toContain('startAt=2');
      expect(thirdCallUrl).toContain('startAt=4');

      // CRITICAL: Each URL should have startAt ONLY ONCE
      expect((firstCallUrl.match(/startAt=/g) || []).length).toBe(1);
      expect((secondCallUrl.match(/startAt=/g) || []).length).toBe(1);
      expect((thirdCallUrl.match(/startAt=/g) || []).length).toBe(1);

      // Should return all 5 issues without duplicates
      expect(result.issues).toHaveLength(5);
      expect(result.total).toBe(5);

      // Verify no duplicates
      const keys = result.issues.map(i => i.key);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(5);
      expect(keys).toEqual(['TEST-1', 'TEST-2', 'TEST-3', 'TEST-4', 'TEST-5']);
    });
  });

  describe('getIssuesForBoard', () => {
    it('should call board endpoint with correct parameters', async () => {
      const mockResponse: JiraSearchResponse = {
        expand: '',
        startAt: 0,
        maxResults: 50,
        total: 1,
        issues: [{
          key: 'TEST-1',
          id: '1',
          self: 'https://jira.example.com/rest/api/2/issue/1',
          fields: {
            summary: 'Test issue',
            created: '2024-01-01T00:00:00.000Z',
            resolutiondate: null,
            issuetype: { id: '1', name: 'Story', iconUrl: '' },
            status: { id: '1', name: 'Open', statusCategory: { id: 1, key: 'new', colorName: 'blue', name: 'New' } }
          }
        }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const client = new JiraClient(TEST_CONFIG);
      const result = await client.getIssuesForBoard('123', '30', 50, 'summary', 'changelog');

      expect(mockFetch).toHaveBeenCalledTimes(1);

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain('/rest/agile/latest/board/123/issue');
      expect(callUrl).toContain('jql=updated%3E%3D-30d');
      expect(callUrl).toContain('maxResults=50');
      expect(callUrl).toContain('fields=summary');
      expect(callUrl).toContain('expand=changelog');

      expect(result.issues).toHaveLength(1);
    });

    it('should handle pagination for board queries without duplicates', async () => {
      const firstPageResponse: JiraSearchResponse = {
        expand: '',
        startAt: 0,
        maxResults: 2,
        total: 3,
        issues: [
          { key: 'BOARD-1', id: '1', self: '', fields: { summary: 'Issue 1', created: '2024-01-01', resolutiondate: null, issuetype: { id: '1', name: 'Story', iconUrl: '' }, status: { id: '1', name: 'Open', statusCategory: { id: 1, key: 'new', colorName: 'blue', name: 'New' } } } },
          { key: 'BOARD-2', id: '2', self: '', fields: { summary: 'Issue 2', created: '2024-01-01', resolutiondate: null, issuetype: { id: '1', name: 'Story', iconUrl: '' }, status: { id: '1', name: 'Open', statusCategory: { id: 1, key: 'new', colorName: 'blue', name: 'New' } } } }
        ]
      };

      const secondPageResponse: JiraSearchResponse = {
        expand: '',
        startAt: 2,
        maxResults: 2,
        total: 3,
        issues: [
          { key: 'BOARD-3', id: '3', self: '', fields: { summary: 'Issue 3', created: '2024-01-01', resolutiondate: null, issuetype: { id: '1', name: 'Story', iconUrl: '' }, status: { id: '1', name: 'Open', statusCategory: { id: 1, key: 'new', colorName: 'blue', name: 'New' } } } }
        ]
      };

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => firstPageResponse } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => secondPageResponse } as Response);

      const client = new JiraClient(TEST_CONFIG);
      const result = await client.getIssuesForBoard('456', '30', 2, 'summary', 'changelog');

      expect(mockFetch).toHaveBeenCalledTimes(2);

      const secondCallUrl = mockFetch.mock.calls[1][0] as string;
      expect(secondCallUrl).toContain('startAt=2');
      expect((secondCallUrl.match(/startAt=/g) || []).length).toBe(1);

      expect(result.issues).toHaveLength(3);
      const keys = result.issues.map(i => i.key);
      expect(keys).toEqual(['BOARD-1', 'BOARD-2', 'BOARD-3']);
    });
  });

  describe('getBoardConfiguration', () => {
    it('should return board configuration for board ID', async () => {
      const boardConfigResponse: JiraBoardConfigResponse = {
        id: '123',
        name: 'Test Board',
        type: 'scrum',
        columnConfig: {
          columns: [
            {
              name: 'To Do',
              statuses: [{
                id: '1'
              }]
            }
          ]
        }
      }
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => boardConfigResponse } as Response);

      const client = new JiraClient(TEST_CONFIG);
      const result = await client.getBoardConfiguration('123');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.name).toBe('Test Board');
      expect(result.columnConfig.columns[0].name).toBe('To Do');
      expect(result.columnConfig.columns[0].statuses[0].id).toBe('1');

    })
  });

  describe('getStatus', () => {
    it('should return status response for actual status', async () => {
      const statusResponse: JiraStatusResponse = {
        id: '1',
        name: 'New',
        statusCategory: {
          name: 'To Do'
        }
      };

      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => statusResponse } as Response);
      const client = new JiraClient(TEST_CONFIG);
      const result = await client.getStatus('1');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.name).toBe('New');
      expect(result.statusCategory.name).toBe('To Do')
    })

  });

  describe('getIssueChangelog', () => {
    it('should fetch changelog for specific issue', async () => {
      const mockResponse = {
        key: 'TEST-1',
        self: '',
        fields: { summary: 'Test' },
        changelog: {
          self: '',
          maxResults: 1,
          startAt: 0,
          total: 1,
          isLast: true,
          histories: [{
            id: '1',
            created: '2024-01-01T00:00:00.000Z',
            author: { displayName: 'User', emailAddress: 'user@test.com' },
            items: [{ field: 'status', fieldtype: 'jira', fieldId: 'status', from: '1', fromString: 'Open', to: '2', toString: 'Done' }]
          }]
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const client = new JiraClient(TEST_CONFIG);
      const result = await client.getIssueWithChangelog('TEST-1');

      expect(mockFetch).toHaveBeenCalledTimes(1);

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain('/rest/api/latest/issue/TEST-1');
      expect(callUrl).toContain('expand=changelog');

      expect(result.changelog?.histories).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {

    it('should throw JiraApiError with correct status for unauthorized', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid credentials',
      } as Response);

      const client = new JiraClient(TEST_CONFIG);

      await expect(
        client.getIssuesForBoard('123', '30', 50, 'summary', '')
      ).rejects.toMatchObject({
        status: 401
      });
    });
  });

  describe('testConnection', () => {
    it('should return true for successful connection', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ displayName: 'Test User' }),
      } as Response);

      const client = new JiraClient(TEST_CONFIG);
      const result = await client.testConnection();

      expect(result).toBe(true);

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain('/rest/api/latest/myself');
    });

    it('should return false for failed connection', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid token',
      } as Response);

      const client = new JiraClient(TEST_CONFIG);
      const result = await client.testConnection();

      expect(result).toBe(false);
    });
  });
});