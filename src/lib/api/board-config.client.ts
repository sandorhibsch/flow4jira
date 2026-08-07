// src/lib/api/board-config.client.ts

import type { ProcessedFlowIssue } from '../flow/flow-types';
import type { WorkflowDefinition } from '../jira/workflow-config';
import type { BoardConfig, BoardConfigMetadata } from '../repositories/board-config.types';

/**
 * API response wrapper
 */
export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; details?: Array<{ field: string; message: string }> };

/**
 * Input for saving board configuration
 */
export interface SaveBoardConfigInput {
  periodDays: number;
  workflow: WorkflowDefinition;
  boardName?: string;
  boardType?: string;
  processedIssues?: ProcessedFlowIssue[];
}

export type DeploymentMode = {
  deploymentMode: 'server' | 'local';
}

/**
 * Client for board configuration API
 * All methods are async and communicate via REST API
 */
export const boardConfigClient = {



  /**
   * Get board configuration by ID
   */
  async get(boardId: string): Promise<ApiResponse<BoardConfig>> {
    try {
      const response = await fetch(`/api/boards/${boardId}/config`);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch board config:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch board configuration',
      };
    }
  },

  /**
   * Save (create or update) board configuration
   */
  async save(boardId: string, input: SaveBoardConfigInput): Promise<ApiResponse<BoardConfig>> {
    try {
      const response = await fetch(`/api/boards/${boardId}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });
      return await response.json();
    } catch (error) {
      console.error('Failed to save board config:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save board configuration',
      };
    }
  },

  /**
   * Delete board configuration
   */
  async delete(boardId: string): Promise<ApiResponse<{ deleted: boolean }>> {
    try {
      const response = await fetch(`/api/boards/${boardId}/config`, {
        method: 'DELETE',
      });
      return await response.json();
    } catch (error) {
      console.error('Failed to delete board config:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete board configuration',
      };
    }
  },

  /**
   * List all board configurations
   */
  async listAll(): Promise<ApiResponse<BoardConfigMetadata[]>> {
    try {
      const response = await fetch('/api/boards');
      return await response.json();
    } catch (error) {
      console.error('Failed to list board configs:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list board configurations',
      };
    }
  },

  /**
   * Check if board configuration exists
   */
  async exists(boardId: string): Promise<boolean> {
    const result = await this.get(boardId);
    return result.success;
  },
};
