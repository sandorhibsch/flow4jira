// src/lib/api/flow-handler.ts

import { JiraClient } from '@/lib/jira/client';
import { processJiraIssue } from '@/lib/flow/processor';
import { DEFAULT_WORKFLOW, WorkflowDefinition } from '@/lib/jira/workflow-config';
import { JiraSearchResponse } from '@/lib/jira/jira-types';

export type FlowHandlerResult = {
  success: boolean;
  data?: {
    issues: any[];
    workflow: WorkflowDefinition;
  };
  metadata?: {
    timestamp: string;
    query?: string;
  };
  error?: string;
  details?: any;
  status: number;
};

export async function handleFlowRequest(
  fetchIssues: (client: JiraClient) => Promise<JiraSearchResponse>,
  queryDescription?: string
): Promise<FlowHandlerResult> {
  try {
    // Set workflow
    const workflow: WorkflowDefinition = DEFAULT_WORKFLOW;

    // Validate environment variables
    const jiraBaseUrl = process.env.JIRA_BASE_URL;
    const jiraBearerToken = process.env.JIRA_PERSONAL_ACCESS_TOKEN;

    if (!jiraBaseUrl || !jiraBearerToken) {
      return {
        success: false,
        error: 'Missing Jira configuration. Check your environment variables',
        status: 500
      };
    }

    // Create Jira client
    const jiraClient = new JiraClient({
      baseUrl: jiraBaseUrl,
      bearerToken: jiraBearerToken
    });

    //console.log(`Fetching flow issues${queryDescription ? `: ${queryDescription}` : ''}`);

    // Fetch issues using the provided function
    const jiraResponse = await fetchIssues(jiraClient);

    //console.log(`Fetched ${jiraResponse.issues.length} issues, processing...`);

    // Process issues through flow processor
    const processedIssues = jiraResponse.issues.map(issue => {
      const issueWithChangelog = issue as any;
      const changelog = issueWithChangelog.changelog;
      return processJiraIssue(workflow, issue, changelog);
    });

    return {
      success: true,
      data: {
        issues: processedIssues,
        workflow: workflow
      },
      metadata: {
        timestamp: new Date().toISOString(),
        ...(queryDescription && { query: queryDescription })
      },
      status: 200
    };

  } catch (error) {
    //console.error('Flow API error:', error);

    // Check for JiraApiError by properties instead of instanceof
    // This is more robust and works better with Jest mocks
    if (error && typeof error === 'object' && 'status' in error && 'name' in error && error.name === 'JiraApiError') {
      const jiraError = error as unknown as { message: string; status: number; response?: any };
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

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      error: `Failed to fetch flow issues: ${errorMessage}`,
      status: 500
    };
  }
}