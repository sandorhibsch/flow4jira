// src/app/api/flow/board/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { handleFlowRequest } from '@/lib/api/flow-handler';

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