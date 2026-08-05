import { NextRequest, NextResponse } from 'next/server';
import { BoardService } from '@/lib/services/board-service';

const boardService = new BoardService();

export async function GET(req: NextRequest) {
  const boardId = req.nextUrl.searchParams.get('boardId');

  if (!boardId) {
    return NextResponse.json({ success: false, error: 'boardId query parameter required' }, { status: 400 });
  }

  const result = await boardService.exists(boardId);
  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
