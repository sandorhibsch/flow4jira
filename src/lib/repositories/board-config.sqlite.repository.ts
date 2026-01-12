// src/lib/repositories/board-config.sqlite.repository.ts

import type { PrismaClient } from '@prisma/client';
import type { IBoardConfigRepository } from './board-config.repository';
import type {
  BoardConfig,
  BoardConfigInput,
  BoardConfigMetadata,
  RepositoryResult,
} from './board-config.types';
import type { WorkflowDefinition } from '../jira/workflow-config';
import type { ProcessedFlowIssue } from '../flow/flow-types';
import { logger } from '../logger';

/**
 * SQLite implementation of the BoardConfig repository using Prisma
 */
export class BoardConfigSqliteRepository implements IBoardConfigRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(input: BoardConfigInput): Promise<RepositoryResult<BoardConfig>> {
    try {
      const workflowJson = JSON.stringify(input.workflow);
      const issuesJson = input.processedIssues
        ? JSON.stringify(input.processedIssues)
        : null;

      const record = await this.prisma.boardConfig.upsert({
        where: { boardId: input.boardId },
        update: {
          boardName: input.boardName,
          boardType: input.boardType,
          periodDays: input.periodDays,
          workflow: workflowJson,
          processedIssues: issuesJson,
          updatedAt: new Date(),
        },
        create: {
          boardId: input.boardId,
          boardName: input.boardName,
          boardType: input.boardType,
          periodDays: input.periodDays,
          workflow: workflowJson,
          processedIssues: issuesJson,
        },
      });

      return {
        success: true,
        data: this.mapToModel(record),
      };
    } catch (error) {
      logger.error('Failed to save board config', error, { boardId: input.boardId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error saving board config',
      };
    }
  }

  async findByBoardId(boardId: string): Promise<RepositoryResult<BoardConfig | null>> {
    try {
      const record = await this.prisma.boardConfig.findUnique({
        where: { boardId },
      });

      if (!record) {
        return { success: true, data: null };
      }

      return {
        success: true,
        data: this.mapToModel(record),
      };
    } catch (error) {
      logger.error('Failed to find board config', error, { boardId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error finding board config',
      };
    }
  }

  async findWorkflowByBoardId(
    boardId: string
  ): Promise<RepositoryResult<WorkflowDefinition | null>> {
    try {
      const record = await this.prisma.boardConfig.findUnique({
        where: { boardId },
        select: { workflow: true },
      });

      if (!record) {
        return { success: true, data: null };
      }

      const workflow = JSON.parse(record.workflow) as WorkflowDefinition;
      return { success: true, data: workflow };
    } catch (error) {
      logger.error('Failed to find workflow', error, { boardId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error finding workflow',
      };
    }
  }

  async findAll(): Promise<RepositoryResult<BoardConfigMetadata[]>> {
    try {
      const records = await this.prisma.boardConfig.findMany({
        select: {
          boardId: true,
          boardName: true,
          boardType: true,
          periodDays: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
      });

      const metadata: BoardConfigMetadata[] = records.map((r: { boardId: string; boardName: string | null; boardType: string | null; periodDays: number; createdAt: Date; updatedAt: Date }) => ({
        boardId: r.boardId,
        boardName: r.boardName ?? undefined,
        boardType: r.boardType ?? undefined,
        periodDays: r.periodDays,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }));

      return { success: true, data: metadata };
    } catch (error) {
      logger.error('Failed to list board configs', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error listing board configs',
      };
    }
  }

  async delete(boardId: string): Promise<RepositoryResult<boolean>> {
    try {
      await this.prisma.boardConfig.delete({
        where: { boardId },
      });
      return { success: true, data: true };
    } catch (error) {
      // Record not found is not an error for delete
      if (this.isPrismaNotFoundError(error)) {
        return { success: true, data: false };
      }
      logger.error('Failed to delete board config', error, { boardId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error deleting board config',
      };
    }
  }

  async exists(boardId: string): Promise<RepositoryResult<boolean>> {
    try {
      const count = await this.prisma.boardConfig.count({
        where: { boardId },
      });
      return { success: true, data: count > 0 };
    } catch (error) {
      logger.error('Failed to check board config existence', error, { boardId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error checking existence',
      };
    }
  }

  /**
   * Map database record to domain model
   */
  private mapToModel(record: {
    boardId: string;
    boardName: string | null;
    boardType: string | null;
    periodDays: number;
    workflow: string;
    processedIssues: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): BoardConfig {
    const workflow = JSON.parse(record.workflow) as WorkflowDefinition;
    const processedIssues = record.processedIssues
      ? (JSON.parse(record.processedIssues) as ProcessedFlowIssue[])
      : undefined;

    return {
      metadata: {
        boardId: record.boardId,
        boardName: record.boardName ?? undefined,
        boardType: record.boardType ?? undefined,
        periodDays: record.periodDays,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      },
      workflow,
      processedIssues,
    };
  }

  /**
   * Check if error is a Prisma "record not found" error
   */
  private isPrismaNotFoundError(error: unknown): boolean {
    return (
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2025'
    );
  }
}
