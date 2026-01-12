import { JiraClientBase } from './jira-client-base';
import type { JiraConfig, JiraSearchResponse, JiraIssue, JiraStatusResponse, JiraBoardConfigResponse } from './jira-types';
import { logger } from '../logger';

/**
 * Jira Server implementation
 * Uses Bearer token authentication and /rest/api/latest endpoints
 */
export class JiraServerClient extends JiraClientBase {
  constructor(config: JiraConfig) {
    super(config);

    if (!config.bearerToken) {
      throw new Error('bearerToken is required for Jira Server');
    }
  }

  protected getAuthHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.config.bearerToken}`,
    };
  }

  protected buildSearchUrl(): string {
    return `${this.config.baseUrl}/rest/api/latest/search`;
  }

  protected buildBoardUrl(boardId: string): string {
    return `${this.config.baseUrl}/rest/agile/latest/board/${boardId}/issue`;
  }

  protected buildIssueUrl(issueKey: string): string {
    return `${this.config.baseUrl}/rest/api/latest/issue/${issueKey}`;
  }

  protected buildBoardConfigUrl(boardId: string): string {
    return `${this.config.baseUrl}/rest/agile/latest/board/${boardId}/configuration`;
  }

  protected buildStatusUrl(statusId: string): string {
    return `${this.config.baseUrl}/rest/api/latest/status/${statusId}`;
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

  async getIssuesForBoard(boardId: string, periodDays: string, maxResults: number = 50, fields: string, expand: string, additionalJql?: string):
Promise<JiraSearchResponse> {
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
      await this.makeRequest(new URL(`${this.config.baseUrl}/rest/api/latest/myself`));
      return true;
    } catch (error) {
      logger.error('Jira Server connection test failed', error);
      return false;
    }
  }
}
