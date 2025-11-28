// src/lib/services/workflow-config-service.ts

import { ProcessedFlowIssue } from '../flow/flow-types';
import { WorkflowDefinition } from '../jira/workflow-config';

const STORAGE_PREFIX = 'workflow:board:';

export type WorkflowConfigMetadata = {
  boardId: string;
  boardName?: string;
  boardType?: string;
  lastModified: string;
};

export type WorkflowConfigWithMetadata = {
  metadata: WorkflowConfigMetadata;
  workflow: WorkflowDefinition;
  processedIssues?: ProcessedFlowIssue[]
};

/**
 * Service for managing workflow configurations using localStorage
 * Note: localStorage is per-browser, not shared across users
 */
export class WorkflowConfigService {
  /**
   * Save a workflow configuration for a board
   */
  static save(
    boardId: string,
    workflow: WorkflowDefinition,
    boardName?: string,
    boardType?: string,
    processedIssues?: ProcessedFlowIssue[]
  ): boolean {
    try {
      const key = `${STORAGE_PREFIX}${boardId}`;
      const config: WorkflowConfigWithMetadata = {
        metadata: {
          boardId,
          boardName,
          boardType,
          lastModified: new Date().toISOString(),
        },
        workflow,
        processedIssues
      };

      localStorage.setItem(key, JSON.stringify(config));
      return true;
    } catch (error) {
      console.error('Failed to save workflow config:', error);
      return false;
    }
  }

  /**
   * Load a workflow configuration for a board
   */
  static load(boardId: string): WorkflowDefinition | null {
    try {
      const key = `${STORAGE_PREFIX}${boardId}`;
      const data = localStorage.getItem(key);

      if (!data) {
        return null;
      }

      const config: WorkflowConfigWithMetadata = JSON.parse(data);
      return config.workflow;
    } catch (error) {
      console.error('Failed to load workflow config:', error);
      return null;
    }
  }

  /**
   * Load full config with metadata for a board
   */
  static loadWithMetadata(
    boardId: string
  ): WorkflowConfigWithMetadata | null {
    try {
      const key = `${STORAGE_PREFIX}${boardId}`;
      const data = localStorage.getItem(key);

      if (!data) {
        return null;
      }

      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load workflow config with metadata:', error);
      return null;
    }
  }

  /**
   * List all configured boards
   */
  static listAll(): WorkflowConfigWithMetadata[] {
    try {
      const configs: WorkflowConfigWithMetadata[] = [];

      // Iterate through all localStorage keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);

        if (key && key.startsWith(STORAGE_PREFIX)) {
          try {
            const data = localStorage.getItem(key);
            if (data) {
              configs.push(JSON.parse(data));
            }
          } catch (error) {
            console.error(`Failed to parse config for key ${key}:`, error);
          }
        }
      }

      // Sort by lastModified descending
      return configs.sort(
        (a, b) =>
          new Date(b.metadata.lastModified).getTime() -
          new Date(a.metadata.lastModified).getTime()
      );
    } catch (error) {
      console.error('Failed to list workflow configs:', error);
      return [];
    }
  }

  /**
   * Delete a workflow configuration
   */
  static delete(boardId: string): boolean {
    try {
      const key = `${STORAGE_PREFIX}${boardId}`;
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Failed to delete workflow config:', error);
      return false;
    }
  }

  /**
   * Check if a workflow exists for a board
   */
  static exists(boardId: string): boolean {
    try {
      const key = `${STORAGE_PREFIX}${boardId}`;
      return localStorage.getItem(key) !== null;
    } catch (error) {
      return false;
    }
  }
}