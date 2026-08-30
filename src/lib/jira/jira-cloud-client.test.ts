import { JiraCloudClient } from './jira-cloud-client';
import type { JiraConfig, JiraSearchResponse } from './jira-types';

const originalFetch = global.fetch;
const fetchDouble = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();

const config: JiraConfig = {
  instanceType: 'cloud',
  baseUrl: 'https://example.atlassian.net',
  basicAuth: { email: 'developer@example.com', apiToken: 'secret-token' },
};

const emptySearchResponse: JiraSearchResponse = {
  expand: '',
  startAt: 0,
  maxResults: 50,
  total: 0,
  issues: [],
};

function response(body: unknown): Response {
  return { ok: true, status: 200, statusText: 'OK', json: async () => body } as Response;
}

describe('JiraCloudClient contract', () => {
  beforeAll(() => {
    global.fetch = fetchDouble;
  });

  beforeEach(() => {
    fetchDouble.mockReset();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('requires complete Cloud credentials', () => {
    expect(() => new JiraCloudClient({ ...config, basicAuth: undefined })).toThrow(
      'basicAuth with email and apiToken is required for Jira Cloud'
    );
    expect(() => new JiraCloudClient({ ...config, basicAuth: { email: '', apiToken: 'token' } })).toThrow(
      'basicAuth with email and apiToken is required for Jira Cloud'
    );
  });

  it('searches the Cloud v3 endpoint with Basic authentication', async () => {
    fetchDouble.mockResolvedValueOnce(response(emptySearchResponse));

    await new JiraCloudClient(config).searchIssues('project = FLOW', 25, 'summary,status', 'changelog');

    expect(fetchDouble).toHaveBeenCalledWith(
      'https://example.atlassian.net/rest/api/3/search/jql?jql=project+%3D+FLOW&maxResults=25&fields=summary%2Cstatus&expand=changelog&startAt=0',
      {
        method: 'GET',
        headers: {
          Authorization: `Basic ${Buffer.from('developer@example.com:secret-token').toString('base64')}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );
  });

  it('uses the Cloud agile endpoint for board issues', async () => {
    fetchDouble.mockResolvedValueOnce(response(emptySearchResponse));

    await new JiraCloudClient(config).getIssuesForBoard('17', '30', 50, 'summary', 'changelog');

    const requestUrl = fetchDouble.mock.calls[0]?.[0];
    expect(requestUrl).toBe(
      'https://example.atlassian.net/rest/agile/1.0/board/17/issue?jql=type+in+standardIssueTypes%28%29+and+type+not+in+%28Epic%29+and+updated%3E%3D-30d&maxResults=50&fields=summary&expand=changelog&startAt=0'
    );
  });

  it.each([
    ['issue', () => new JiraCloudClient(config).getIssueWithChangelog('FLOW-7'), '/rest/api/3/issue/FLOW-7?fields=summary&expand=changelog'],
    ['board configuration', () => new JiraCloudClient(config).getBoardConfiguration('17'), '/rest/agile/1.0/board/17/configuration'],
    ['status', () => new JiraCloudClient(config).getStatus('10001'), '/rest/api/3/status/10001'],
  ])('uses the Cloud endpoint for %s', async (_name, request, path) => {
    fetchDouble.mockResolvedValueOnce(response({}));

    await request();

    expect(fetchDouble.mock.calls[0]?.[0]).toBe(`https://example.atlassian.net${path}`);
  });

  it('reports connection success and failure without leaking transport errors', async () => {
    const loggerSpy = jest.spyOn(console, 'error').mockImplementation();
    fetchDouble
      .mockResolvedValueOnce(response({ accountId: 'user-1' }))
      .mockRejectedValueOnce(new Error('network unavailable'));
    const client = new JiraCloudClient(config);

    await expect(client.testConnection()).resolves.toBe(true);
    await expect(client.testConnection()).resolves.toBe(false);

    loggerSpy.mockRestore();
  });
});
