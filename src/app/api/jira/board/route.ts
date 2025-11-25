// src/app/api/jira/board/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { JiraClient } from '@/lib/jira/client';

/**
 * GET /api/jira/board?boardId={id}
 * Fetch board configuration from Jira
 * Note: Returns column structure but NOT status names (to avoid rate limiting)
 * Users will manually enter status names in the UI
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const boardId = searchParams.get('boardId');

    if (!boardId) {
      return NextResponse.json(
        { success: false, error: 'boardId is required' },
        { status: 400 }
      );
    }

    const jiraBaseUrl = process.env.JIRA_BASE_URL;
    const jiraBearerToken = process.env.JIRA_PERSONAL_ACCESS_TOKEN;

    if (!jiraBaseUrl || !jiraBearerToken) {
      return NextResponse.json(
        { success: false, error: 'Missing Jira configuration' },
        { status: 500 }
      );
    }

    const jiraClient = new JiraClient({
      baseUrl: jiraBaseUrl,
      bearerToken: jiraBearerToken,
    });

    // Fetch board configuration
    const boardConfig = await jiraClient.getBoardConfiguration(boardId);

    // Extract column names (helpful for user to see board structure)
    const columns: Array<{ name: string; statusCount: number }> = [];

    if (boardConfig.columnConfig?.columns) {
      boardConfig.columnConfig.columns.forEach((column: any) => {
        columns.push({
          name: column.name,
          statusCount: column.statuses?.length || 0,
        });
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        board: {
          id: boardConfig.id?.toString() || boardId,
          name: boardConfig.name,
          type: boardConfig.type || 'unknown',
        },
        columns: columns,
        message: 'Board configuration loaded. You can now manually add status names to your workflow stages.',
      },
    });
  } catch (error) {
    console.error('Error fetching board info:', error);

    if (error && typeof error === 'object' && 'status' in error && 'name' in error && error.name === 'JiraApiError') {
      const jiraError = error as unknown as { message: string; status: number };
      return NextResponse.json(
        { success: false, error: `Jira API Error: ${jiraError.message}` },
        { status: jiraError.status }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Failed to fetch board info: ${errorMessage}` },
      { status: 500 }
    );
  }
}