// src/app/api/boards/route.ts

import { NextResponse } from 'next/server';
import { BoardConfigService } from '@/lib/services/board-config.service';
import { logger } from '@/lib/logger';

/**
 * GET /api/boards
 * List all configured boards
 */
export async function GET() {
  try {
    const boards = await BoardConfigService.listAll();

    return NextResponse.json({
      success: true,
      data: boards,
    });
  } catch (error) {
    logger.error('Error listing boards', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list boards' },
      { status: 500 }
    );
  }
}
