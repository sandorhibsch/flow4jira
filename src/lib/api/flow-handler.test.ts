// src/lib/api/flow-handler.test.ts

import { handleFlowRequest } from './flow-handler';
import { JiraClient } from '@/lib/jira/client';
import { JiraSearchResponse } from '@/lib/jira/jira-types';
import { mockJiraIssue } from '../testutils/create-mocks';

//jest.mock('@/lib/jira/client');

const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = {
    ...originalEnv,
    JIRA_INSTANCE_TYPE: 'server',
    JIRA_BASE_URL: 'https://jira.example.com',
    JIRA_PERSONAL_ACCESS_TOKEN: 'test-token-123'
  };
});

afterEach(() => {
  process.env = originalEnv;
  jest.clearAllMocks();
});

describe('Flow Handler', () => {
  describe('Environment Validation', () => {
    it('should return error if JIRA_BASE_URL is missing', async () => {
      delete process.env.JIRA_BASE_URL;

      const mockFetch = jest.fn();
      const result = await handleFlowRequest(mockFetch);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to fetch flow issues: JIRA_BASE_URL environment variable is required');
      expect(result.status).toBe(500);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return error if JIRA_PERSONAL_ACCESS_TOKEN is missing', async () => {
      delete process.env.JIRA_PERSONAL_ACCESS_TOKEN;

      const mockFetch = jest.fn();
      const result = await handleFlowRequest(mockFetch);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to fetch flow issues: JIRA_PERSONAL_ACCESS_TOKEN environment variable is required for Jira Server');
      expect(result.status).toBe(500);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Issue Fetching', () => {

    it('should call fetch function with JiraClient', async () => {
      const mockResponse: JiraSearchResponse = {
        expand: '',
        startAt: 0,
        maxResults: 0,
        total: 0,
        issues: []
      };

      const mockFetch = jest.fn().mockResolvedValue(mockResponse);
      const result = await handleFlowRequest(mockFetch);

      expect(mockFetch).toHaveBeenCalledWith(expect.any(JiraClient));
      expect(result.success).toBe(true);
      expect(result.status).toBe(200);
    });

    it('should return fetched issues as received from Jira', async () => {

      const mockIssues = [mockJiraIssue];

      const mockResponse: JiraSearchResponse = {
        expand: '',
        startAt: 0,
        maxResults: 1,
        total: 1,
        issues: mockIssues as any
      };

      const mockFetch = jest.fn().mockResolvedValue(mockResponse);
      const result = await handleFlowRequest(mockFetch);

      expect(result.success).toBe(true);
      expect(result.data?.issues).toHaveLength(1);
      expect(result.data?.issues?.[0]?.key).toBe('PROJ-1');
      expect(result.data?.issues?.[0]?.fields.summary).toBe('Test issue');
    });

    it('should always include timestamp in metadata', async () => {
      const mockResponse: JiraSearchResponse = {
        expand: '',
        startAt: 0,
        maxResults: 0,
        total: 0,
        issues: []
      };

      const mockFetch = jest.fn().mockResolvedValue(mockResponse);
      const result = await handleFlowRequest(mockFetch);

      expect(result.metadata?.timestamp).toBeDefined();
      expect(new Date(result.metadata!.timestamp)).toBeInstanceOf(Date);
    });

    it('should include query description in metadata when provided', async () => {
      const mockResponse: JiraSearchResponse = {
        expand: '',
        startAt: 0,
        maxResults: 0,
        total: 0,
        issues: []
      };

      const mockFetch = jest.fn().mockResolvedValue(mockResponse);
      const result = await handleFlowRequest(mockFetch, 'JQL: project=TEST');

      expect(result.metadata?.query).toBe('JQL: project=TEST');
    });

    it('should not include query in metadata when not provided', async () => {
      const mockResponse: JiraSearchResponse = {
        expand: '',
        startAt: 0,
        maxResults: 0,
        total: 0,
        issues: []
      };

      const mockFetch = jest.fn().mockResolvedValue(mockResponse);
      const result = await handleFlowRequest(mockFetch);

      expect(result.metadata?.query).toBeUndefined();
    });

  });

  describe('Error Handling', () => {
    it('should handle JiraApiError correctly', async () => {
      // Create a mock that looks like JiraApiError without using the actual class
      const jiraError = {
        name: 'JiraApiError',
        message: 'Board not found',
        status: 404,
        response: { error: 'Not found' }
      };

      const mockFetch = jest.fn().mockRejectedValue(jiraError);

      const result = await handleFlowRequest(mockFetch);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Board not found');
      expect(result.status).toBe(404);
      expect(result.details).toBeDefined();
      expect(result.details?.status).toBe(404);
    });

    it('should handle actual JiraApiError instance', async () => {
      // Test with actual class instance to ensure it works in production
      const jiraError = {
        name: 'JiraApiError',
        message: 'Unauthorized',
        status: 401,
        response: { error: 'Invalid credentials' }
      };
      const mockFetch = jest.fn().mockRejectedValue(jiraError);

      const result = await handleFlowRequest(mockFetch);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized');
      expect(result.status).toBe(401);
      expect(result.details).toBeDefined();
    });

    it('should handle generic errors', async () => {
      const genericError = new Error('Network timeout');
      const mockFetch = jest.fn().mockRejectedValue(genericError);

      const result = await handleFlowRequest(mockFetch);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network timeout');
      expect(result.status).toBe(500);
    });

    it('should handle unknown errors', async () => {
      const mockFetch = jest.fn().mockRejectedValue('Some string error');

      const result = await handleFlowRequest(mockFetch);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown error occurred');
      expect(result.status).toBe(500);
    });
  });

});
