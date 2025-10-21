// src/lib/jira/client.ts

import { JiraConfig, JiraSearchResponse, JiraChangelogResponse } from './types';

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

    return this.getAllPagesForQuery(params, maxResults);
  }

  // Helper method to get all issues (handles pagination)
  private async getAllPagesForQuery(params: Record<string, string>, pageSize: number): Promise<JiraSearchResponse> {
    let startAt = 0;
    let allIssues: JiraSearchResponse['issues'] = [];
    let total = 0;

    do {
      const pagination = {
        ...params,
        startAt: startAt.toString(),
      };

      const batch = await this.makeRequest<JiraSearchResponse>('search', pagination);
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

  private async makeRequest<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.config.baseUrl}/rest/api/latest/${endpoint}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    console.log(`Querying URL: ${url}`);

    const response = await fetch(url.toString(), {
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

  async getIssueChangelog(issueKey: string): Promise<JiraChangelogResponse> {
    const params = {
      fields: "summary",
      expand: "changelog"
    }
    return this.makeRequest<JiraChangelogResponse>(`issue/${issueKey}`, params);
  }

  // Test connection method
  async testConnection(): Promise<boolean> {
    try {
      await this.makeRequest('myself');
      return true;
    } catch (error) {
      console.error('Jira connection test failed:', error);
      return false;
    }
  }
}