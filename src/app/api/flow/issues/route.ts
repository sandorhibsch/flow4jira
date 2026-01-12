// src/app/api/flow/issues/route.ts

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { handleFlowRequest } from '@/lib/api/flow-handler';

export async function GET(request: NextRequest) {
  // Extract query parameters
  const searchParams = request.nextUrl.searchParams;
  const jql = searchParams.get('jql') || "updated>=-1d";

  const result = await handleFlowRequest(
    async (client) => {
      const fields = 'summary,issuetype,status,created,resolutiondate';
      const expand = 'changelog';
      return client.searchIssues(jql, 100, fields, expand);
    },
    `JQL: ${jql}`
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