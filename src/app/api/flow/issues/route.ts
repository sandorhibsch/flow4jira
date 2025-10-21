// src/app/api/flow/issues/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { JiraClient, JiraApiError } from '@/lib/jira/client';
import { processJiraIssues, calculateSummary } from '@/lib/flow/processor';
import { FLOW_METRICS_FILTER } from '@/lib/jira/filters';

export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const jql = searchParams.get('jql') || FLOW_METRICS_FILTER.baseJql;

    // Validate environment variables
    const jiraBaseUrl = process.env.JIRA_BASE_URL;
    const jiraBearerToken = process.env.JIRA_PERSONAL_ACCESS_TOKEN;

    if (!jiraBaseUrl || !jiraBearerToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing Jira configuration. Check your environment variables'
        },
        { status: 500 }
      );
    }

    // Create Jira client
    const jiraClient = new JiraClient({
      baseUrl: jiraBaseUrl,
      bearerToken: jiraBearerToken
    });

    // Test connection
    const connectionOk = await jiraClient.testConnection();
    if (!connectionOk) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to connect to Jira. Check your credentials and base URL.'
        },
        { status: 401 }
      );
    }

    console.log(`Fetching flow issues with JQL: ${jql}`);

    // Fetch issues with changelog expanded
    const fields = 'summary,issuetype,status,created,resolutiondate';
    const expand = 'changelog';

    const jiraResponse = await jiraClient.searchIssues(jql, 100, fields, expand);

    console.log(`Fetched ${jiraResponse.issues.length} issues, processing...`);

    // Process issues through flow processor
    // Note: The Jira API with expand=changelog returns changelog in the issue object
    // We need to extract it properly
    const processedIssues = jiraResponse.issues.map(issue => {
      // The changelog should be in issue.changelog if expanded correctly
      // Type assertion needed since our types don't include changelog on JiraIssue yet
      const issueWithChangelog = issue as any;
      const changelog = issueWithChangelog.changelog;

      return processJiraIssues([{ issue, changelog }])[0];
    });

    const summary = calculateSummary(processedIssues);

    return NextResponse.json({
      success: true,
      data: {
        issues: processedIssues,
        summary: summary
      },
      metadata: {
        query: jql,
        timestamp: new Date().toISOString(),
      }
    });

  } catch (error) {
    console.error('Flow API error:', error);

    if (error instanceof JiraApiError) {
      return NextResponse.json(
        {
          success: false,
          error: `Jira API Error: ${error.message}`,
          details: {
            status: error.status,
            response: error.response
          }
        },
        { status: error.status }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      {
        success: false,
        error: `Failed to fetch flow issues: ${errorMessage}`
      },
      { status: 500 }
    );
  }
}