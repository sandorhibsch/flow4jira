import { JiraClientFactory } from "./jira-client-factory";
import { JiraSearchResponse, JiraChangelogResponse, JiraConfig, JiraIssue } from "./jira-types";

//Mock fetch globally
global.fetch = jest.fn();

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

const JIRA_SERVER_CONFIG: JiraConfig = {
  instanceType: 'server',
  baseUrl: 'https://jira.example.com',
  bearerToken: 'test_token'
}

beforeEach(() => {
  jest.clearAllMocks();

  jest.spyOn(console, 'log').mockImplementation();
  jest.spyOn(console, 'error').mockImplementation();
});

describe('Jira base client - issue pagination', () => {

  it('should handle issue pagination without duplicates', async () => {

    const firstPageResponse: JiraSearchResponse = createMockSearchResponse(0, 2, 3, ['TEST-1', 'TEST-2']);
    const secondPageResponse: JiraSearchResponse = createMockSearchResponse(2, 2, 3, ['TEST-3']);

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => firstPageResponse } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => secondPageResponse } as Response)

    const client = JiraClientFactory.create(JIRA_SERVER_CONFIG);
    const result = await client.getIssuesForBoard('1', '30', 2, '', '');

    expect(mockFetch).toHaveBeenCalledTimes(2);

    const secondCallUrl = mockFetch.mock.calls[1][0] as string;
    expect(secondCallUrl).toContain('startAt=2');
    expect((secondCallUrl.match(/startAt=/g) || []).length).toBe(1);

    expect(result.issues).toHaveLength(3);
    const keys = result.issues.map(i => i.key);
    expect(keys).toEqual(['TEST-1', 'TEST-2', 'TEST-3']);

  });

});

function createIssueWithChangelog(key: string, total: number, changelogCount: number): JiraIssue {
  return {
    key,
    id: key.split('-')[1],
    self: `https://jira.example.com/rest/api/2/issue/${key}`,
    fields: {
      summary: 'Test',
      created: '2024-01-01',
      resolutiondate: null,
      issuetype: { id: '1', name: 'Story', iconUrl: '' },
      status: { id: '1', name: 'Open', statusCategory: { id: 1, key: 'new', colorName: 'blue', name: 'New' } }
    },
    changelog: {
      self: '',
      maxResults: changelogCount,
      startAt: 0,
      total,
      isLast: changelogCount >= total,
      histories: Array(changelogCount).fill({
        id: '1',
        created: '2024-01-01T00:00:00.000Z',
        author: { displayName: 'User', emailAddress: 'user@test.com' },
        items: [{ field: 'status', fieldtype: 'jira', fieldId: 'status', from: '1', fromString: 'Open', to: '2', toString: 'Done' }]
      })
    }
  };
}

function createMockSearchResponse(startAt: number, maxResults: number, total: number, keys: string[]): JiraSearchResponse {
  return {
    expand: '',
    startAt,
    maxResults,
    total,
    issues: keys.map((key, idx) => ({
      id: (startAt + idx + 1).toString(),
      key,
      self: '',
      fields: {
        summary: 'Test 1',
        created: '2025-01-01',
        resolutiondate: null,
        issuetype: {
          id: '1',
          iconUrl: '',
          name: 'task'
        },
        status: {
          name: 'todo',
          id: '1',
          statusCategory: {
            id: 1,
            key: '1',
            colorName: '',
            name: 'new'
          }
        }
      }
    }))
  };
}

function createMockChangelogResponse(startAt: number, maxResults: number, total: number): JiraChangelogResponse {
  return {
    self: '',
    startAt,
    maxResults,
    total,
    isLast: startAt + maxResults <= total,
    histories: Array(maxResults).fill({
      created: '2024-01-01T00:00:00.000Z',
      author: { displayName: 'User', emailAddress: 'user@test.com' },
      items: [{ field: 'status', fieldtype: 'jira', fieldId: 'status', from: '1', fromString: 'Open', to: '2', toString: 'Done' }]
    })
  }
}