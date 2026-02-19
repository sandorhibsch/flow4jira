import { JiraClientFactory } from "./jira-client-factory";
import { RequestThrottler } from "./jira-request-throttler";
import type { JiraSearchResponse, JiraConfig } from "./jira-types";
import { createMockSearchResponse } from "../testutils/create-mocks";
import { JiraApiError, JiraClientBase } from "./jira-client-base";

//Mock fetch globally
global.fetch = jest.fn();

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
const mockThrottler = new RequestThrottler();
const mockThrottle = mockThrottler.throttle as jest.MockedFunction<typeof mockThrottler.throttle>
class TestJiraClientBase extends JiraClientBase {
  public async testGetAllPagesForQuery(...args: Parameters<JiraClientBase['getAllPagesForQuery']>) {
    return this.getAllPagesForQuery(...args);
  }

  public async testMakeRequest(...args: Parameters<JiraClientBase['makeRequest']>) {
    return this.makeRequest(...args);
  }

  protected getAuthHeaders() { return {}; }
  protected buildSearchUrl() { return ''; }
  protected buildBoardUrl() { return ''; }
  protected buildIssueUrl() { return ''; }
  protected buildBoardConfigUrl() { return ''; }
  protected buildStatusUrl() { return ''; }
  searchIssues = jest.fn();
  getIssuesForBoard = jest.fn();
  getIssueWithChangelog = jest.fn();
  getBoardConfiguration = jest.fn();
  getStatus = jest.fn();
  testConnection = jest.fn();
  sleep = jest.fn();
}

const JIRA_SERVER_CONFIG: JiraConfig = {
  instanceType: 'server',
  baseUrl: 'https://jira.example.com',
  bearerToken: 'test_token'
}

let client: TestJiraClientBase;

beforeEach(() => {
  jest.clearAllMocks();
  client = new TestJiraClientBase(JIRA_SERVER_CONFIG);

  jest.spyOn(console, 'log').mockImplementation();
  jest.spyOn(console, 'error').mockImplementation();
});

describe('Jira base client - issue pagination', () => {

  it('should not paginate when no need to', async () => {
    const url = new URL('https://www.example.com');
    const firstPageResponse: JiraSearchResponse = createMockSearchResponse(0, 2, 2, ['TEST-1', 'TEST-2']);

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => firstPageResponse } as Response);

    const result = await client.testGetAllPagesForQuery(url, {}, 2);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const keys = result.issues.map(i => i.key);
    expect(keys).toEqual(['TEST-1', 'TEST-2']);
  });

  it('should handle issue pagination without duplicates', async () => {
    const firstPageResponse: JiraSearchResponse = createMockSearchResponse(0, 2, 3, ['TEST-1', 'TEST-2']);
    const secondPageResponse: JiraSearchResponse = createMockSearchResponse(2, 2, 3, ['TEST-3']);

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => firstPageResponse } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => secondPageResponse } as Response)

    const url = new URL('https://www.example.com');
    const result = await client.testGetAllPagesForQuery(url, {}, 2);

    expect(mockFetch).toHaveBeenCalledTimes(2);

    const secondCallUrl = mockFetch.mock.calls[1]?.[0] as string;
    expect(secondCallUrl).toContain('startAt=2');
    expect((secondCallUrl.match(/startAt=/g) || []).length).toBe(1);

    expect(result.issues).toHaveLength(3);
    const keys = result.issues.map(i => i.key);
    expect(keys).toEqual(['TEST-1', 'TEST-2', 'TEST-3']);
  });
});

describe('Jira base client - API error handling', () => {
  it('should retry with delay if rate limiting occurs', async () => {
    const url = new URL('https://www.example.com');
    // First two responses: 429, then success
    const retryAfter = '1';
    const errorResponse429 = {
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      headers: { get: (name: string) => name === 'retry-after' ? retryAfter : null },
      json: async () => ({})
    } as Response;

    const firstPageResponse: JiraSearchResponse = createMockSearchResponse(0, 2, 3, ['TEST-1', 'TEST-2']);
    const successResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: (name: string) => null },
      json: async () => (firstPageResponse)
    } as Response;
    mockFetch
      .mockResolvedValueOnce(errorResponse429)
      .mockResolvedValueOnce(errorResponse429)
      .mockResolvedValueOnce(successResponse);

    const result = await client.testMakeRequest(url) as JiraSearchResponse;

    expect(mockFetch).toHaveBeenCalledTimes(3);
    const keys = result.issues.map(i => i.key);
    expect(keys).toEqual(['TEST-1', 'TEST-2']);
  });

  it('should throw error if rate limiting still occurs after 3 retries', async () => {
    const url = new URL('https://www.example.com');
    const retryAfter = '1';
    const errorResponse429 = {
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      headers: { get: (name: string) => name === 'retry-after' ? retryAfter : null },
      json: async () => ({})
    } as Response;

    mockFetch.mockResolvedValue(errorResponse429);

    await expect(client.testMakeRequest(url)).rejects.toThrow('Jira API rate limit exceeded');
    expect(mockFetch).toHaveBeenCalledTimes(4); // 0 + 3 retries
  });

  it('should throw JiraAPIError for any other error codes, with proper message', async () => {
    const url = new URL('https://www.example.com');
    const errorResponse = {
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: { get: (name: string) => null },
      json: async () => ({})
    } as Response;
    mockFetch.mockResolvedValueOnce(errorResponse);

    await expect(client.testMakeRequest(url)).rejects.toThrow('Jira API request failed: 500 Internal Server Error');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe('Jira base client - makeRequest success and params', () => {
  it('should call fetch with params', async () => {
    const url = new URL('https://www.example.com');
    const response = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: (name: string) => null },
      json: async () => ({ foo: 'bar' })
    } as Response;
    mockFetch.mockResolvedValueOnce(response);
    const params = { a: '1', b: '2' };
    await client.testMakeRequest(url, params);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl = mockFetch.mock.calls[0]![0] as string;
    expect(calledUrl).toContain('a=1');
    expect(calledUrl).toContain('b=2');
  });
});

