import type { JiraConfig, JiraSearchResponse, JiraIssue, JiraStatusResponse, JiraBoardConfigResponse } from './jira-types';
import { logger } from '../logger';
import { RequestThrottler } from './jira-request-throttler';

export class JiraApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: unknown,
    public retryAfter?: number
  ) {
    super(message);
    this.name = 'JiraApiError';
  }
}

/**
 * Default retry configuration for rate-limited requests
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
} as const;

// Global throttler instance (shared across all Jira clients)
const globalThrottler = new RequestThrottler(100);

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
    const requestUrl = this.buildRequestUrl(url, params);

    await globalThrottler.throttle();
    let lastError: JiraApiError | null = null;

    for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
      try {
        logger.debug('Jira API request', {
          endpoint: requestUrl.pathname,
          hasParams: !!params,
          attempt: attempt > 0 ? attempt : undefined
        });

        const response = await this.fetchRequestFromJira<T>(requestUrl);

        if (response.ok) {
          return response.json();
        }

        //Handle rate limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after');
          const delay = this.getRetryDelay(attempt, retryAfter ?? undefined);

          if (attempt < RETRY_CONFIG.maxRetries) {
            logger.warn('Rate limited by Jira API, retrying', {
              endpoint: requestUrl.pathname,
              attempt: attempt + 1,
              retryInMs: delay
            });
            await this.sleep(delay);
            continue;
          }

          throw new JiraApiError(
            `Jira API rate limit exceeded after ${RETRY_CONFIG.maxRetries} retries`,
            429,
            response,
            retryAfter ? parseInt(retryAfter, 10) : undefined
          );
        }

        throw new JiraApiError(
          `Jira API request failed: ${response.status} ${response.statusText}`,
          response.status,

        );

      } catch (error) {
        if (error instanceof JiraApiError) {
          lastError = error;
          if (error.status !== 429) {
            throw error;
          }
        } else {
          throw error;
        }
      }
    }

    if (lastError) {
      throw lastError;
    }

    // This should never happen, but TypeScript needs it
    throw new Error('Unexpected error in makeRequest');
  }

  private buildRequestUrl(url: URL, params: Record<string, string> | undefined) {
    const requestUrl = new URL(url.toString());

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        requestUrl.searchParams.set(key, value);
      });
    }
    return requestUrl;
  }

  private async fetchRequestFromJira<T>(requestUrl: URL) {
    return await fetch(requestUrl.toString(), {
      method: 'GET',
      headers: {
        ...this.getAuthHeaders(),
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  private getRetryDelay(attempt: number, retryAfterHeader?: string): number {
    if (retryAfterHeader) {
      const retryAfterSeconds = parseInt(retryAfterHeader, 10);
      if (!isNaN(retryAfterSeconds)) {
        return (retryAfterSeconds + 1) * 1000;
      }
    }

    // Exponential backoff: 1s, 2s, 4s, 8s... capped at maxDelayMs
    const delay = Math.min(
      RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt),
      RETRY_CONFIG.maxDelayMs
    );

    // Add jitter (±20%) to prevent thundering herd
    const jitter = delay * 0.2 * (Math.random() - 0.5);
    return Math.round(delay + jitter);
  }
}
