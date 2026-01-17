// src/hooks/use-board-config.ts

import { useState, useEffect, useCallback } from 'react';
import type { ProcessedFlowIssue } from '@/lib/flow/flow-types';
import type { WorkflowDefinition } from '@/lib/jira/workflow-config';
import type { BoardConfig, BoardConfigMetadata } from '@/lib/repositories';
import { boardConfigClient } from '@/lib/api/board-config.client';

export interface UseBoardConfigState {
  /** Whether initial load is in progress */
  isLoading: boolean;
  /** Whether a save operation is in progress */
  isSaving: boolean;
  /** Error message if any operation failed */
  error: string | null;
  /** Board configuration data */
  config: BoardConfig | null;
  /** Shorthand for config?.metadata */
  metadata: BoardConfigMetadata | null;
  /** Shorthand for config?.workflow */
  workflow: WorkflowDefinition | null;
  /** Shorthand for config?.processedIssues */
  processedIssues: ProcessedFlowIssue[];
}

export interface UseBoardConfigActions {
  /** Reload the board configuration from the server */
  reload: () => Promise<void>;
  /** Save/update the board configuration */
  save: (
    periodDays: number,
    workflow: WorkflowDefinition,
    boardName?: string,
    boardType?: string,
    processedIssues?: ProcessedFlowIssue[]
  ) => Promise<boolean>;
  /** Clear any error state */
  clearError: () => void;
}

export type UseBoardConfigResult = UseBoardConfigState & UseBoardConfigActions;

/**
 * Hook for managing board configuration
 * Handles loading, saving, and state management for a single board's config
 */
export function useBoardConfig(boardId: string | undefined): UseBoardConfigResult {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<BoardConfig | null>(null);

  // Load configuration on mount or when boardId changes
  const loadConfig = useCallback(async () => {
    if (!boardId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await boardConfigClient.get(boardId);

    if (result.success) {
      setConfig(result.data);
    } else {
      // 404 is not an error - just means no config exists yet
      if (!result.error.includes('not found')) {
        setError(result.error);
      }
      setConfig(null);
    }

    setIsLoading(false);
  }, [boardId]);

  // Initial load
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Save configuration
  const save = useCallback(
    async (
      periodDays: number,
      workflow: WorkflowDefinition,
      boardName?: string,
      boardType?: string,
      processedIssues?: ProcessedFlowIssue[]
    ): Promise<boolean> => {
      if (!boardId) {
        setError('Board ID is required');
        return false;
      }

      setIsSaving(true);
      setError(null);

      const result = await boardConfigClient.save(boardId, {
        periodDays,
        workflow,
        boardName,
        boardType,
        processedIssues,
      });

      if (result.success) {
        setConfig(result.data);
        setIsSaving(false);
        return true;
      } else {
        setError(result.error);
        setIsSaving(false);
        return false;
      }
    },
    [boardId]
  );

  const reload = useCallback(async () => {
    await loadConfig();
  }, [loadConfig]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    isLoading,
    isSaving,
    error,
    config,
    metadata: config?.metadata ?? null,
    workflow: config?.workflow ?? null,
    processedIssues: config?.processedIssues ?? [],

    // Actions
    reload,
    save,
    clearError,
  };
}
