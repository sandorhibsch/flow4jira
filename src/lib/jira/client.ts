// src/lib/jira/client.ts

import { JiraConfig, JiraSearchResponse, JiraChangelogResponse, JiraIssue, JiraStatusResponse, JiraBoardConfigResponse } from './jira-types';

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


export class JiraClient {
  private config: JiraConfig;

  constructor(config: JiraConfig) {
    this.config = config;
  }

  async searchIssues(jql: string, maxResults: number = 50, fields: string, expand: string): Promise<JiraSearchResponse> {
    const params = {
      jql,
      maxResults: maxResults.toString(),
      fields,
      expand
    };

    const url = new URL(`${this.config.baseUrl}/rest/api/latest/search`);

    return this.getAllPagesForQuery(url, params, maxResults);
  }

  async getIssuesForBoard(boardId: string, periodDays: string, maxResults: number = 50, fields: string, expand: string): Promise<JiraSearchResponse> {
    const jql = `updated>=-${periodDays}d`
    const params = {
      jql,
      maxResults: maxResults.toString(),
      fields,
      expand
    };

    const url = new URL(`${this.config.baseUrl}/rest/agile/latest/board/${boardId}/issue`);

    return this.getAllPagesForQuery(url, params, maxResults);
  }

  async getIssueWithChangelog(issueKey: string): Promise<JiraIssue> {
    const params = {
      fields: "summary",
      expand: "changelog"
    }
    const url = new URL(`${this.config.baseUrl}/rest/api/latest/issue/${issueKey}`);

    return this.makeRequest<JiraIssue>(url, params);
  }

  async getBoardConfiguration(boardId: string): Promise<JiraBoardConfigResponse> {
    const url = new URL(`${this.config.baseUrl}/rest/agile/latest/board/${boardId}/configuration`);
    return this.makeRequest<JiraBoardConfigResponse>(url);
  }

  async getStatus(statusId: string): Promise<JiraStatusResponse> {
    const url = new URL(`${this.config.baseUrl}/rest/api/latest/status/${statusId}`);
    return this.makeRequest<JiraStatusResponse>(url);
  }

  // Helper method to get all issues (handles pagination)
  private async getAllPagesForQuery(url: URL, params: Record<string, string>, pageSize: number): Promise<JiraSearchResponse> {
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

  private async makeRequest<T>(url: URL, params?: Record<string, string>): Promise<T> {
    // Clone the URL to avoid parameter accumulation across pagination
    // Using url.toString() creates a new URL instance with a fresh searchParams
    const requestUrl = new URL(url.toString());

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        // Use .set() instead of .append() to replace existing params, not accumulate
        requestUrl.searchParams.set(key, value);
      });
    }

    // Convert to string AFTER setting params - this includes all query parameters
    const urlString = requestUrl.toString();
    console.log(`Querying URL: ${urlString}`);

    const response = await fetch(urlString, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.config.bearerToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new JiraApiError(
        `Jira API request failed: ${response.status} ${response.statusText}`,
        response.status,
        response
      );
    }

    return response.json();
  }

  // Test connection method
  async testConnection(): Promise<boolean> {
    try {
      await this.makeRequest(new URL(`${this.config.baseUrl}/rest/api/latest/myself`));
      return true;
    } catch (error) {
      //console.error('Jira connection test failed:', error);
      return false;
    }
  }
}