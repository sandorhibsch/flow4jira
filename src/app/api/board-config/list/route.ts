import { NextRequest, NextResponse } from 'next/server';
import { BoardService } from '@/lib/services/board-service';
import { BoardConfigPgRepository } from '@/lib/repositories/board-config.pg.repository';
const boardService = new BoardService(new BoardConfigPgRepository());

export async function GET(_req: NextRequest) {
  const result = await boardService.listAll();
  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
