// src/lib/services/board-config.service.ts

import type { ProcessedFlowIssue } from '../flow/flow-types';
import type { WorkflowDefinition } from '../jira/workflow-config';
import {
  getBoardConfigRepository,
  type BoardConfig,
  type BoardConfigMetadata,
  type RepositoryResult,
} from '../repositories';
import { logger } from '../logger';

/**
 * Service for managing board configurations.
 * Acts as a facade over the repository layer.
 */
export class BoardConfigService {
  /**
   * Save a board configuration
   */
  static async save(
    boardId: string,
    periodDays: number,
    workflow: WorkflowDefinition,
    boardName?: string,
    boardType?: string,
    processedIssues?: ProcessedFlowIssue[]
  ): Promise<RepositoryResult<BoardConfig>> {
    const repository = await getBoardConfigRepository();

    return repository.save({
      boardId,
      periodDays,
      workflow,
      boardName,
      boardType,
      processedIssues,
    });
  }

  /**
   * Load a workflow configuration for a board
   */
  static async load(boardId: string): Promise<WorkflowDefinition | null> {
    const repository = await getBoardConfigRepository();
    const result = await repository.findWorkflowByBoardId(boardId);

    if (!result.success) {
      logger.error('Failed to load workflow', undefined, { boardId, error: result.error });
      return null;
    }

    return result.data;
  }

  /**
   * Load full config with metadata for a board
   */
  static async loadWithMetadata(boardId: string): Promise<BoardConfig | null> {
    const repository = await getBoardConfigRepository();
    const result = await repository.findByBoardId(boardId);

    if (!result.success) {
      logger.error('Failed to load board config', undefined, { boardId, error: result.error });
      return null;
    }

    return result.data;
  }

  /**
   * List all configured boards (metadata only)
   */
  static async listAll(): Promise<BoardConfigMetadata[]> {
    const repository = await getBoardConfigRepository();
    const result = await repository.findAll();

    if (!result.success) {
      logger.error('Failed to list board configs', undefined, { error: result.error });
      return [];
    }

    return result.data;
  }

  /**
   * Delete a board configuration
   */
  static async delete(boardId: string): Promise<boolean> {
    const repository = await getBoardConfigRepository();
    const result = await repository.delete(boardId);

    if (!result.success) {
      logger.error('Failed to delete board config', undefined, { boardId, error: result.error });
      return false;
    }

    return result.data;
  }

  /**
   * Check if a board configuration exists
   */
  static async exists(boardId: string): Promise<boolean> {
    const repository = await getBoardConfigRepository();
    const result = await repository.exists(boardId);

    if (!result.success) {
      logger.error('Failed to check board existence', undefined, { boardId, error: result.error });
      return false;
    }

    return result.data;
  }
}
