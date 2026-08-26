import type { JiraClientProvider } from './ports/jira-client-provider';
import { handleFlowRequest } from './flow-handler';
import { JiraApiError, JiraClientBase } from '../jira/jira-client-base';
import type { JiraBoardConfigResponse, JiraConfig, JiraIssue, JiraSearchResponse, JiraStatusResponse } from '../jira/jira-types';
import { mockJiraIssue } from '../testutils/create-mocks';

const TEST_CONFIG: JiraConfig = {
  instanceType: 'server', baseUrl: 'https://jira.example.com', bearerToken: 'token',
};

class StrictJiraClientFake extends JiraClientBase {
  protected getAuthHeaders(): Record<string, string> { return {}; }
  protected buildSearchUrl(): string { throw new Error('Unexpected client call: buildSearchUrl'); }
  protected buildBoardUrl(): string { throw new Error('Unexpected client call: buildBoardUrl'); }
  protected buildIssueUrl(): string { throw new Error('Unexpected client call: buildIssueUrl'); }
  protected buildBoardConfigUrl(): string { throw new Error('Unexpected client call: buildBoardConfigUrl'); }
  protected buildStatusUrl(): string { throw new Error('Unexpected client call: buildStatusUrl'); }
  searchIssues(): Promise<JiraSearchResponse> { throw new Error('Unexpected client call: searchIssues'); }
  getIssuesForBoard(): Promise<JiraSearchResponse> { throw new Error('Unexpected client call: getIssuesForBoard'); }
  getIssueWithChangelog(): Promise<JiraIssue> { throw new Error('Unexpected client call: getIssueWithChangelog'); }
  getBoardConfiguration(): Promise<JiraBoardConfigResponse> { throw new Error('Unexpected client call: getBoardConfiguration'); }
  getStatus(): Promise<JiraStatusResponse> { throw new Error('Unexpected client call: getStatus'); }
  testConnection(): Promise<boolean> { throw new Error('Unexpected client call: testConnection'); }
}

class RecordingJiraClientProvider implements JiraClientProvider {
  readonly client = new StrictJiraClientFake(TEST_CONFIG);
  configs: Array<JiraConfig | undefined> = [];
  error?: unknown;

  create(config?: JiraConfig): JiraClientBase {
    this.configs.push(config);
    if (this.error) throw this.error;
    return this.client;
  }
}

function searchResponse(issues: JiraIssue[] = []): JiraSearchResponse {
  return { expand: '', startAt: 0, maxResults: issues.length, total: issues.length, issues };
}

describe('handleFlowRequest', () => {
  let provider: RecordingJiraClientProvider;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-02-03T04:05:06.000Z'));
    provider = new RecordingJiraClientProvider();
  });

  afterEach(() => jest.useRealTimers());

  it('provides the created client to the use case and maps its issues', async () => {
    const observedClients: JiraClientBase[] = [];
    const fetchIssues = async (client: JiraClientBase) => {
      observedClients.push(client);
      return searchResponse([mockJiraIssue]);
    };

    const result = await handleFlowRequest(fetchIssues, provider, 'JQL: project=TEST', TEST_CONFIG);

    expect(provider.configs).toEqual([TEST_CONFIG]);
    expect(observedClients).toEqual([provider.client]);
    expect(result).toEqual({
      success: true,
      data: { issues: [mockJiraIssue] },
      metadata: { timestamp: '2025-02-03T04:05:06.000Z', query: 'JQL: project=TEST' },
      status: 200,
    });
  });

  it('asks the provider to resolve configuration when none is supplied', async () => {
    await handleFlowRequest(async () => searchResponse(), provider);
    expect(provider.configs).toEqual([undefined]);
  });

  it('maps Jira API failures without calling the provider twice', async () => {
    const error = new JiraApiError('Board not found', 404, { error: 'not found' });
    const result = await handleFlowRequest(async () => { throw error; }, provider);

    expect(result).toEqual({
      success: false,
      error: 'Jira API Error: Board not found',
      details: { status: 404, response: { error: 'not found' } },
      status: 404,
    });
    expect(provider.configs).toHaveLength(1);
  });

  it('maps provider failures without invoking the use case', async () => {
    provider.error = new Error('Jira configuration unavailable');
    let useCaseCalled = false;

    const result = await handleFlowRequest(async () => {
      useCaseCalled = true;
      return searchResponse();
    }, provider);

    expect(result).toEqual({
      success: false,
      error: 'Failed to fetch flow issues: Jira configuration unavailable',
      status: 500,
    });
    expect(useCaseCalled).toBe(false);
  });

  it('maps unknown rejections without leaking their representation', async () => {
    const result = await handleFlowRequest(async () => { throw 'failure'; }, provider);

    expect(result).toEqual({
      success: false,
      error: 'Failed to fetch flow issues: Unknown error occurred',
      status: 500,
    });
  });
});
