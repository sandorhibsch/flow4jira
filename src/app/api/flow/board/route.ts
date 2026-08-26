// src/app/api/flow/board/route.ts

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { handleFlowRequest } from '@/lib/api/flow-handler';
import type { JiraConfig } from '@/lib/jira/jira-types';
import { jiraClientProvider } from '@/lib/jira/jira-client-provider';

export async function GET(request: NextRequest) {
  // Extract query parameters
  const searchParams = request.nextUrl.searchParams;

  const boardId = searchParams.get('boardId');
  if (!boardId) {
    return NextResponse.json(
      {
        success: false,
        error: 'Please provide a board ID'
      },
      { status: 400 }
    );
  }

  const periodDays = searchParams.get('periodDays') || '1';

  const result = await handleFlowRequest(
    async (client) => {
      const fields = 'summary,issuetype,status,created,resolutiondate';
      const expand = 'changelog';
      return client.getIssuesForBoard(boardId, periodDays, 100, fields, expand);
    },
    jiraClientProvider,
    `Board ${boardId}, last ${periodDays} days`
  );

  return NextResponse.json(
    {
      success: result.success,
      ...(result.data && { data: result.data }),
      ...(result.metadata && { metadata: result.metadata }),
      ...(result.error && { error: result.error }),
      ...(result.details && { details: result.details })
    },
    { status: result.status }
  );
}

// Type for POST body
export interface FlowBoardRequest {
  boardId: string;
  periodDays?: string;
  config: JiraConfig;
}

/**
 * POST /api/flow/board
 * Fetch flow issues for a board using provided Jira config
 * Expects: { boardId: string, periodDays?: string, config: JiraConfig } in JSON body
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const boardId = body.boardId;
    const periodDays = body.periodDays || '1';

    if (!boardId) {
      return NextResponse.json(
        { success: false, error: 'boardId is required' },
        { status: 400 }
      );
    }

    let config: JiraConfig | undefined;
    try {
      config = body.config === undefined || body.config === null
        ? undefined
        : typeof body.config === 'string' ? JSON.parse(body.config) : body.config;
    } catch (parseErr) {
      return NextResponse.json(
        { success: false, error: 'Invalid Jira config provided' },
        { status: 400 }
      );
    }

    const result = await handleFlowRequest(
      async (client) => {
        const fields = 'summary,issuetype,status,created,resolutiondate';
        const expand = 'changelog';
        return client.getIssuesForBoard(boardId, periodDays, 100, fields, expand);
      },
      jiraClientProvider,
      `Board ${boardId}, last ${periodDays} days`,
      config
    );

    return NextResponse.json(
      {
        success: result.success,
        ...(result.data && { data: result.data }),
        ...(result.metadata && { metadata: result.metadata }),
        ...(result.error && { error: result.error }),
        ...(result.details && { details: result.details })
      },
      { status: result.status }
    );
  } catch (error) {
    console.error('Error in POST /api/flow/board:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Failed to fetch flow issues: ${errorMessage}` },
      { status: 500 }
    );
  }
}
