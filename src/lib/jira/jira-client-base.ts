import { JiraConfig, JiraSearchResponse, JiraIssue, JiraStatusResponse, JiraBoardConfigResponse } from './jira-types.ts';

export class JiraApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any
  ) {
    super(message);
    this.name = 'JiraApiError';
  }
}

export abstract class JiraClientBase {
  protected config: JiraConfig;

  constructor(config: JiraConfig) {
    this.config = config;
  }

  protected abstract getAuthHeaders(): Record<string, string>;
  protected abstract buildSearchUrl(): string;
  protected abstract buildBoardUrl(boardId: string): string;
  protected abstract buildIssueUrl(issueKey: string): string;
  protected abstract buildBoardConfigUrl(boardId: string): string;
  protected abstract buildStatusUrl(statusId: string): string;

  abstract searchIssues(jql: string, maxResults: number, fields: string, expand: string): Promise<JiraSearchResponse>;
  abstract getIssuesForBoard(boardId: string, periodDays: string, maxResults: number, fields: string, expand: string, additionalJql?: string): Promise<JiraSearchResponse>;
  abstract getIssueWithChangelog(issueKey: string): Promise<JiraIssue>;
  abstract getBoardConfiguration(boardId: string): Promise<JiraBoardConfigResponse>;
  abstract getStatus(statusId: string): Promise<JiraStatusResponse>;
  abstract testConnection(): Promise<boolean>;

  protected async getAllPagesForQuery(url: URL, params: Record<string, string>, pageSize: number): Promise<JiraSearchResponse> {
    let startAt = 0;
    let allIssues: JiraSearchResponse['issues'] = [];
    let total = 0;

    do {
      const pagination = {
        ...params,
        startAt: startAt.toString(),
      };

    const batch = await this.makeRequest<JiraSearchResponse>(url, pagination);
    allIssues = allIssues.concat(batch.issues);
    total = batch.total;
    startAt += pageSize;
    } while (allIssues.length < total);

    return {
      expand: '',
      startAt: 0,
      maxResults: allIssues.length,
      total: allIssues.length,
      issues: allIssues
    };
  }

  protected async makeRequest<T>(url: URL, params?: Record<string, string>): Promise<T> {
    const requestUrl = new URL(url.toString());

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        requestUrl.searchParams.set(key, value);
      });
    }

    const urlString = requestUrl.toString();
    console.log(`?Querying URL: ${urlString}`);

    const response = await fetch(urlString, {
      method: 'GET',
      headers: {
        ...this.getAuthHeaders(),
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new JiraApiError(
        `Jira API reques failed: ${response.status} ${response.statusText}`,
        response.status,
        response
      );
    }

    return response.json();
  }
}
