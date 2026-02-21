// src/lib/repositories/board-config.types.ts

import type { ProcessedFlowIssue } from '../flow/flow-types';
import type { WorkflowDefinition } from '../jira/workflow-config';

/**
 * Metadata for a board configuration
 */
export interface BoardConfigMetadata {
  boardId: string;
  boardName?: string;
  boardType?: string;
  periodDays: number;
  updatedAt: Date;
}

/**
 * Full board configuration with workflow and optional processed issues
 */
export interface BoardConfig {
  metadata: BoardConfigMetadata;
  workflow: WorkflowDefinition;
  processedIssues?: ProcessedFlowIssue[];
}

/**
 * Input for creating/updating a board configuration
 */
export interface BoardConfigInput {
  boardId: string;
  boardName?: string;
  boardType?: string;
  periodDays: number;
  workflow: WorkflowDefinition;
  processedIssues?: ProcessedFlowIssue[];
}

/**
 * Result type for repository operations
 */
export type RepositoryResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
