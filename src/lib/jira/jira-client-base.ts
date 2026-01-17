import type { JiraConfig, JiraSearchResponse, JiraIssue, JiraStatusResponse, JiraBoardConfigResponse } from './jira-types';
import { logger } from '../logger';

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

/**
 * Simple rate limiter to prevent concurrent requests
 * Jira Server often has very low rate limits (1 req/sec)
 */
class RequestThrottler {
  private lastRequestTime = 0;
  private minIntervalMs: number;

  constructor(minIntervalMs = 1100) {
    this.minIntervalMs = minIntervalMs;
  }

  async throttle(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minIntervalMs) {
      const waitTime = this.minIntervalMs - timeSinceLastRequest;
      await this.sleep(waitTime);
    }
    
    this.lastRequestTime = Date.now();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Global throttler instance (shared across all Jira clients)
const globalThrottler = new RequestThrottler();

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

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Calculate delay with exponential backoff
   */
  private getRetryDelay(attempt: number, retryAfterHeader?: string): number {
    // If server provided retry-after, use that
    if (retryAfterHeader) {
      const retryAfterSeconds = parseInt(retryAfterHeader, 10);
      if (!isNaN(retryAfterSeconds)) {
        return (retryAfterSeconds + 1) * 1000; // Add 1 second buffer
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

  protected async makeRequest<T>(url: URL, params?: Record<string, string>): Promise<T> {
    const requestUrl = new URL(url.toString());

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        requestUrl.searchParams.set(key, value);
      });
    }

    // Throttle requests to avoid rate limiting
    await globalThrottler.throttle();

    let lastError: JiraApiError | null = null;

    for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
      try {
        // Only log endpoint path in development, never full URL with potential tokens
        logger.debug('Jira API request', { 
          endpoint: requestUrl.pathname,
          hasParams: !!params,
          attempt: attempt > 0 ? attempt : undefined
        });

        const response = await fetch(requestUrl.toString(), {
          method: 'GET',
          headers: {
            ...this.getAuthHeaders(),
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          return response.json();
        }

        // Handle rate limiting (429)
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
          
          // Max retries exceeded
          throw new JiraApiError(
            `Jira API rate limit exceeded after ${RETRY_CONFIG.maxRetries} retries`,
            429,
            response,
            retryAfter ? parseInt(retryAfter, 10) : undefined
          );
        }

        // Other errors - don't retry
        throw new JiraApiError(
          `Jira API request failed: ${response.status} ${response.statusText}`,
          response.status,
          response
        );

      } catch (error) {
        if (error instanceof JiraApiError) {
          lastError = error;
          // Only retry on 429, throw immediately for other errors
          if (error.status !== 429) {
            throw error;
          }
        } else {
          // Network error or other unexpected error
          throw error;
        }
      }
    }

    // If we exhausted all retries, throw the last error
    if (lastError) {
      throw lastError;
    }

    // This should never happen, but TypeScript needs it
    throw new Error('Unexpected error in makeRequest');
  }
}
