import { NextRequest, NextResponse } from 'next/server';
import { BoardConfigPgRepository } from '@/lib/repositories/board-config.pg.repository';
import { BoardConfigImportExportService } from '@/lib/services/boardconfig-importexport-service';

const repository = new BoardConfigPgRepository();
const importExportService = new BoardConfigImportExportService(repository);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await importExportService.importConfig(body);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
