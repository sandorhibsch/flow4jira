import { NextRequest, NextResponse } from 'next/server';
import { BoardService } from '@/lib/services/board-service';

const boardService = new BoardService();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await boardService.importConfig(body);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}