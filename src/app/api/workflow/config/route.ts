// src/app/api/workflow/config/route.ts

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { WorkflowConfigService } from '@/lib/services/workflow-config-service';
import type { WorkflowDefinition } from '@/lib/jira/workflow-config';

/**
 * GET /api/workflow/config?boardId={id}
 * Load workflow configuration for a board
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const boardId = searchParams.get('boardId');

    if (!boardId) {
      return boardIDRequiredError();
    }

    const config = WorkflowConfigService.loadWithMetadata(boardId);

    if (!config) {
      return workflowConfigNotFoundError();
    }

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Error loading workflow config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load configuration' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workflow/config
 * Save workflow configuration for a board
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { boardId, periodDays, workflow, boardName } = body;

    if (!boardId) {
      return boardIDRequiredError();
    }

    if (!workflow) {
      return workflowConfigRequiredError();
    }

    if (!periodDays) {
      return periodDaysRequiredError();
    }

    // Validate workflow structure
    if (!workflow.key || !workflow.name || !Array.isArray(workflow.stages)) {
      return invalidWorkflowConfigError();
    }

    const success = WorkflowConfigService.save(
      boardId,
      periodDays,
      workflow as WorkflowDefinition,
      boardName
    );

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to save configuration' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Configuration saved successfully',
    });
  } catch (error) {
    console.error('Error saving workflow config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save configuration' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workflow/config?boardId={id}
 * Delete workflow configuration for a board
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const boardId = searchParams.get('boardId');

    if (!boardId) {
      return boardIDRequiredError();
    }

    const success = WorkflowConfigService.delete(boardId);

    if (!success) {
      return deleteConfigError();
    }

    return NextResponse.json({
      success: true,
      message: 'Configuration deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting workflow config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete configuration' },
      { status: 500 }
    );
  }
}

function boardIDRequiredError() {
  return NextResponse.json(
    { success: false, error: 'Board ID is required' },
    { status: 400 }
  );
}

function workflowConfigNotFoundError() {
  return NextResponse.json(
    { success: false, error: 'Configuration not found' },
    { status: 404 }
  );
}

function workflowConfigRequiredError() {
  return NextResponse.json(
    { success: false, error: 'Workflow is required' },
    { status: 400 }
  );
}

function invalidWorkflowConfigError() {
  return NextResponse.json(
    { success: false, error: 'Invalid workflow structure' },
    { status: 400 }
  );
}

function deleteConfigError() {
  return NextResponse.json(
    { success: false, error: 'Failed to delete configuration' },
    { status: 500 }
  );
}

function periodDaysRequiredError() {
  return NextResponse.json(
    { success: false, error: 'Period is required' },
    { status: 400 }
  );
}
