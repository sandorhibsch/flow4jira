import { NextRequest, NextResponse } from 'next/server';
import type { BoardConfigInput } from '@/lib/repositories/board-config.types';
import { BoardService } from '@/lib/services/board-service';
import { BoardConfigPgRepository } from '@/lib/repositories/board-config.pg.repository';

const boardService = new BoardService(new BoardConfigPgRepository());

export async function GET(req: NextRequest) {
  const boardId = req.nextUrl.searchParams.get('boardId');

  if (!boardId) {
    return NextResponse.json(
      { success: false, error: 'boardId query parameter required' },
      { status: 400 }
    );
  }

  const result = await boardService.findByBoardId(boardId);
  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as BoardConfigInput;
    const result = await boardService.save(body);
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const boardId = req.nextUrl.searchParams.get('boardId');

  if (!boardId) {
    return NextResponse.json(
      { success: false, error: 'boardId query parameter required' },
      { status: 400 }
    );
  }

  const result = await boardService.delete(boardId);
  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
