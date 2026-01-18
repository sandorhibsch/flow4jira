// src/app/api/boards/[boardId]/config/route.ts

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { BoardConfigService } from '@/lib/services/board-config.service';
import { SaveBoardConfigSchema, BoardIdSchema, formatZodErrors } from '@/lib/validations';
import { logger } from '@/lib/logger';
import type { ProcessedFlowIssue } from '@/lib/flow/flow-types';

interface RouteParams {
  params: Promise<{ boardId: string }>;
}

/**
 * GET /api/boards/[boardId]/config
 * Retrieve board configuration
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { boardId } = await params;

  // Validate boardId
  const boardIdResult = BoardIdSchema.safeParse(boardId);
  if (!boardIdResult.success) {
    return NextResponse.json(
      { success: false, error: 'Board ID is required' },
      { status: 400 }
    );
  }

  try {
    const config = await BoardConfigService.loadWithMetadata(boardIdResult.data);

    if (!config) {
      return NextResponse.json(
        { success: false, error: 'Board configuration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    logger.error('Error loading board config', error, { boardId });
    return NextResponse.json(
      { success: false, error: 'Failed to load board configuration' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/boards/[boardId]/config
 * Create or update board configuration
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { boardId } = await params;

  // Validate boardId
  const boardIdResult = BoardIdSchema.safeParse(boardId);
  if (!boardIdResult.success) {
    return NextResponse.json(
      { success: false, error: 'Board ID is required' },
      { status: 400 }
    );
  }

  try {
    const body: unknown = await request.json();

    // Validate request body with Zod
    const validationResult = SaveBoardConfigSchema.safeParse(body);

    if (!validationResult.success) {
      const errorDetails = formatZodErrors(validationResult.error);
      logger.warn('Board config validation failed', {
        boardId,
        errors: errorDetails,
        receivedFields: Object.keys(body as object)
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: errorDetails,
        },
        { status: 400 }
      );
    }

    const { periodDays, workflow, boardName, boardType, processedIssues } = validationResult.data;

    // Cast processedIssues to correct type - Zod validation ensures runtime correctness
    const typedProcessedIssues = processedIssues as ProcessedFlowIssue[] | undefined;

    const result = await BoardConfigService.save(
      boardIdResult.data,
      periodDays,
      workflow,
      boardName,
      boardType,
      typedProcessedIssues
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: formatZodErrors(error),
        },
        { status: 400 }
      );
    }

    logger.error('Error saving board config', error, { boardId });
    return NextResponse.json(
      { success: false, error: 'Failed to save board configuration' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/boards/[boardId]/config
 * Delete board configuration
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { boardId } = await params;

  // Validate boardId
  const boardIdResult = BoardIdSchema.safeParse(boardId);
  if (!boardIdResult.success) {
    return NextResponse.json(
      { success: false, error: 'Board ID is required' },
      { status: 400 }
    );
  }

  try {
    const deleted = await BoardConfigService.delete(boardIdResult.data);

    return NextResponse.json({
      success: true,
      data: { deleted },
    });
  } catch (error) {
    logger.error('Error deleting board config', error, { boardId });
    return NextResponse.json(
      { success: false, error: 'Failed to delete board configuration' },
      { status: 500 }
    );
  }
}
