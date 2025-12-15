import { JiraClientBase } from './jira-client-base';
import { JiraConfig, JiraSearchResponse, JiraIssue, JiraStatusResponse, JiraBoardConfigResponse } from './jira-types';

/**
 * Jira Cloud implementation
 * Uses Basic Auth (email + API token) and /rest/api/3 endpoints
 */
export class JiraCloudClient extends JiraClientBase {
  constructor(config: JiraConfig) {
    super(config);

    if (!config.basicAuth || !config.basicAuth.email || !config.basicAuth.apiToken) {
      throw new Error('basicAuth with email and apiToken is required for Jira Cloud');
    }
  }

  protected getAuthHeaders(): Record<string, string> {
    const { email, apiToken } = this.config.basicAuth!;
    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');

    return {
      'Authorization': `Basic ${auth}`,
    };
  }

  protected buildSearchUrl(): string {
    return `${this.config.baseUrl}/rest/api/3/search/jql`;
  }

  protected buildBoardUrl(boardId: string): string {
    return `${this.config.baseUrl}/rest/agile/1.0/board/${boardId}/issue`;
  }

  protected buildIssueUrl(issueKey: string): string {
    return `${this.config.baseUrl}/rest/api/3/issue/${issueKey}`;
  }

  protected buildBoardConfigUrl(boardId: string): string {
    return `${this.config.baseUrl}/rest/agile/1.0/board/${boardId}/configuration`;
  }

  protected buildStatusUrl(statusId: string): string {
    return `${this.config.baseUrl}/rest/api/3/status/${statusId}`;
  }

  async searchIssues(jql: string, maxResults: number = 50, fields: string, expand: string): Promise<JiraSearchResponse> {
    const params = {
      jql,
      maxResults: maxResults.toString(),
      fields,
      expand
    };

    const url = new URL(this.buildSearchUrl());
    return this.getAllPagesForQuery(url, params, maxResults);
  }

  async getIssuesForBoard(boardId: string, periodDays: string, maxResults: number = 50, fields: string, expand: string, additionalJql?:
string): Promise<JiraSearchResponse> {
    const jql = additionalJql ?
      `type in standardIssueTypes() and type not in (Epic) and ${additionalJql} and updated>=-${periodDays}d` :
      `type in standardIssueTypes() and type not in (Epic) and updated>=-${periodDays}d`;

    const params = {
      jql,
      maxResults: maxResults.toString(),
      fields,
      expand
    };

    const url = new URL(this.buildBoardUrl(boardId));
    return this.getAllPagesForQuery(url, params, maxResults);
  }

  async getIssueWithChangelog(issueKey: string): Promise<JiraIssue> {
    const params = {
      fields: "summary",
      expand: "changelog"
    };

    const url = new URL(this.buildIssueUrl(issueKey));
    return this.makeRequest<JiraIssue>(url, params);
  }

  async getBoardConfiguration(boardId: string): Promise<JiraBoardConfigResponse> {
    const url = new URL(this.buildBoardConfigUrl(boardId));
    return this.makeRequest<JiraBoardConfigResponse>(url);
  }

  async getStatus(statusId: string): Promise<JiraStatusResponse> {
    const url = new URL(this.buildStatusUrl(statusId));
    return this.makeRequest<JiraStatusResponse>(url);
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.makeRequest(new URL(`${this.config.baseUrl}/rest/api/3/myself`));
      return true;
    } catch (error) {
      console.error('Jira connection test failed:', error);
      return false;
    }
  }
}
