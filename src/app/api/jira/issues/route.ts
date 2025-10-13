import { NextRequest, NextResponse } from 'next/server';
import { JiraClient, JiraApiError } from '@/lib/jira/client';
import { FLOW_METRICS_FILTER } from '@/lib/jira/filters';

export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const jql = searchParams.get('jql') || FLOW_METRICS_FILTER.baseJql;
    const fields = searchParams.get('fields') || 'summary';
    const expand = searchParams.get('expand') || 'changelog';

    // Validate environment variables
    const jiraBaseUrl = process.env.JIRA_BASE_URL;
    const jiraBearerToken = process.env.JIRA_PERSONAL_ACCESS_TOKEN;

    if (!jiraBaseUrl || !jiraBearerToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing Jira configuration. Check your environment variables: JIRA_BASE_URL, JIRA_PERSONAL_ACCESS_TOKEN'
        },
        { status: 500 }
      );
    }

    // Create Jira client instance
    const jiraClient = new JiraClient({
      baseUrl: jiraBaseUrl,
      bearerToken: jiraBearerToken
    });

    // Test connection first (optional but helpful for debugging)

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

    // Fetch issues from Jira
    console.log(`Executing JQL: ${jql}`);
    const jiraResponse = await jiraClient.searchIssues(jql, 50, fields, expand);

    // Return successful response
    return NextResponse.json({
      success: true,
      data: {
        total: jiraResponse.total,
        issues: jiraResponse.issues,
        maxResults: jiraResponse.maxResults,
        startAt: jiraResponse.startAt
      },
      metadata: {
        query: jql,
        timestamp: new Date().toISOString(),
        totalIssues: jiraResponse.total
      }
    });

  } catch (error) {
    console.error('Jira API error:', error);

    // Handle specific Jira API errors
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

    // Handle general errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      {
        success: false,
        error: `Failed to fetch Jira issues: ${errorMessage}`
      },
      { status: 500 }
    );
  }
}