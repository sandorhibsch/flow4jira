// src/app/api/jira/board/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { JiraClient } from '@/lib/jira/client';

/**
 * GET /api/jira/board?boardId={id}
 * Fetch board information and configuration from Jira
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

    // Extract unique status IDs from columns
    const statusIds = new Set<string>();
    if (boardConfig.columnConfig?.columns) {
      boardConfig.columnConfig.columns.forEach((column: any) => {
        if (column.statuses) {
          column.statuses.forEach((status: any) => {
            statusIds.add(status.id);
          });
        }
      });
    }

    // Fetch status details for each status ID
    const statusPromises = Array.from(statusIds).map(async (statusId) => {
      try {
        const status = await jiraClient.getStatus(statusId);
        return status.name;
      } catch (error) {
        //console.error(`Failed to fetch status ${statusId}:`, error);
        return null;
      }
    });

    const statusNames = await Promise.all(statusPromises);

    // Filter out nulls and sort
    const statuses = statusNames
      .filter((name): name is string => name !== null)
      .sort();

    return NextResponse.json({
      success: true,
      data: {
        board: {
          id: boardConfig.id?.toString() || boardId,
          name: boardConfig.name,
          type: boardConfig.type || 'unknown',
        },
        statuses: statuses,
        columns: boardConfig.columnConfig?.columns || [],
      },
    });
  } catch (error) {
    //console.error('Error fetching board info:', error);

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