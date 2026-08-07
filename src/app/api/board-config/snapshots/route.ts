import { NextRequest, NextResponse } from 'next/server';
import { BoardConfigPgRepository } from '@/lib/repositories/board-config.pg.repository';
import type { ProcessedFlowIssue } from '@/lib/flow/flow-types';

const repo = new BoardConfigPgRepository();

export async function GET(req: NextRequest) {
  const boardId = req.nextUrl.searchParams.get('boardId');

  if (!boardId) {
    return NextResponse.json(
      { success: false, error: 'boardId query parameter required' },
      { status: 400 }
    );
  }

  const result = await repo.listSnapshots(boardId);
  return NextResponse.json(result, { status: result.success ? 200 : 404 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      boardId: string;
      processedIssues: ProcessedFlowIssue[];
      source?: string;
    };

    if (!body.boardId || !body.processedIssues) {
      return NextResponse.json(
        { success: false, error: 'boardId and processedIssues required' },
        { status: 400 }
      );
    }

    const result = await repo.saveSnapshot(body.boardId, body.processedIssues, body.source);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}