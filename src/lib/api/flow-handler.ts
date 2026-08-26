// src/lib/api/flow-handler.ts

import type { JiraClientBase } from '@/lib/jira/jira-client-base';
import type { JiraIssue, JiraSearchResponse, JiraConfig } from '@/lib/jira/jira-types';
import type { JiraClientProvider } from './ports/jira-client-provider';

export interface FlowHandlerResult {
  success: boolean;
  data?: {
    issues: JiraIssue[];
  };
  metadata?: {
    timestamp: string;
    query?: string;
  };
  error?: string;
  details?: {
    status: number;
    response?: unknown;
  };
  status: number;
}

export async function handleFlowRequest(
  fetchIssues: (client: JiraClientBase) => Promise<JiraSearchResponse>,
  clientProvider: JiraClientProvider,
  queryDescription?: string,
  config?: JiraConfig
): Promise<FlowHandlerResult> {
  try {
    const jiraClient = clientProvider.create(config);

    // Fetch issues using the provided function
    const jiraResponse = await fetchIssues(jiraClient);

    return {
      success: true,
      data: {
        issues: jiraResponse.issues,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        ...(queryDescription && { query: queryDescription })
      },
      status: 200
    };

  } catch (error) {
    // Check for JiraApiError by properties instead of instanceof
    // This is more robust and works better with Jest mocks
    if (error && typeof error === 'object' && 'status' in error && 'name' in error && error.name === 'JiraApiError') {
      const jiraError = error as unknown as { message: string; status: number; response?: unknown };
      return {
        success: false,
        error: `Jira API Error: ${jiraError.message}`,
        details: {
          status: jiraError.status,
          response: jiraError.response
        },
        status: jiraError.status
      };
    }

    // Handle generic errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      error: `Failed to fetch flow issues: ${errorMessage}`,
      status: 500
    };
  }
}
