import { IBoardConfigRepository } from '@/lib/repositories/board-config.repository';
import type { BoardConfig, BoardConfigInput, BoardConfigMetadata, RepositoryResult } from '@/lib/repositories/board-config.types';
import prisma from '@/lib/server/db/prisma-client';
import { deserializeProcessedIssues, serializeProcessedIssues } from '@/lib/serializers/processed-issue.serializer';
import type { ProcessedFlowIssue } from '@/lib/flow/flow-types';
import type { Prisma } from '@prisma/client';

function toJsonValue<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export interface SnapshotMetadata {
  snapshotId: string;
  createdAt: Date;
  source: string;
}

export interface SnapshotRecord {
  snapshotId: string;
  boardId: string;
  processedIssues: ProcessedFlowIssue[];
  createdAt: Date;
  source: string;
}

export class BoardConfigPgRepository implements IBoardConfigRepository {
  async save(input: BoardConfigInput): Promise<RepositoryResult<BoardConfig>> {
    try {
      const serialized = input.processedIssues ? serializeProcessedIssues(input.processedIssues) : undefined;

      const workflowJson = toJsonValue(input.workflow);
      const board = await prisma.board.upsert({
        where: { boardId: input.boardId },
        update: {
          boardName: input.boardName,
          boardType: input.boardType,
          periodDays: input.periodDays,
          workflow: workflowJson as Prisma.InputJsonValue,
          processedIssues: serialized
        },
        create: {
          boardId: input.boardId,
          boardName: input.boardName,
          boardType: input.boardType,
          periodDays: input.periodDays,
          workflow: workflowJson as Prisma.InputJsonValue,
          processedIssues: serialized
        }
      });

      const processedIssues = board.processedIssues ? deserializeProcessedIssues(board.processedIssues as any[]) : [];

      return {
        success: true,
        data: {
          metadata: {
            boardId: board.boardId,
            boardName: board.boardName || '',
            boardType: board.boardType,
            periodDays: board.periodDays,
            updatedAt: board.updatedAt
          },
          workflow: board.workflow as any,
          processedIssues
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error saving board'
      };
    }
  }

  async findByBoardId(boardId: string): Promise<RepositoryResult<BoardConfig | null>> {
    try {
      const board = await prisma.board.findUnique({ where: { boardId } });
      if (!board) {
        return { success: true, data: null };
      }

      const processedIssues = board.processedIssues ? deserializeProcessedIssues(board.processedIssues as any[]) : [];

      return {
        success: true,
        data: {
          metadata: {
            boardId: board.boardId,
            boardName: board.boardName || '',
            boardType: board.boardType,
            periodDays: board.periodDays,
            updatedAt: board.updatedAt
          },
          workflow: board.workflow as any,
          processedIssues
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error finding board'
      };
    }
  }

  async findWorkflowByBoardId(boardId: string): Promise<RepositoryResult<BoardConfig['workflow'] | null>> {
    try {
      const board = await prisma.board.findUnique({ where: { boardId } });
      return {
        success: true,
        data: board ? (board.workflow as any) : null
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error finding workflow'
      };
    }
  }

  async listAll(): Promise<RepositoryResult<BoardConfigMetadata[]>> {
    try {
      const boards = await prisma.board.findMany({
        orderBy: { updatedAt: 'desc' }
      });

      return {
        success: true,
        data: boards.map(b => ({
          boardId: b.boardId,
          boardName: b.boardName || '',
          boardType: b.boardType,
          periodDays: b.periodDays,
          updatedAt: b.updatedAt
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error listing boards'
      };
    }
  }

  async delete(boardId: string): Promise<RepositoryResult<boolean>> {
    try {
      const result = await prisma.board.delete({ where: { boardId } });
      return { success: true, data: !!result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error deleting board'
      };
    }
  }

  async exists(boardId: string): Promise<RepositoryResult<boolean>> {
    try {
      const board = await prisma.board.findUnique({ where: { boardId } });
      return { success: true, data: !!board };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error checking existence'
      };
    }
  }

  // Snapshot methods (not required by interface)
  async saveSnapshot(boardId: string, processedIssues: ProcessedFlowIssue[], source?: string): Promise<RepositoryResult<SnapshotRecord>> {
    try {
      const serialized = serializeProcessedIssues(processedIssues);
      const snapshot = await prisma.snapshot.create({
        data: {
          boardId,
          processedIssues: serialized,
          source: source || 'manual'
        }
      });

      return {
        success: true,
        data: {
          snapshotId: snapshot.snapshotId,
          boardId: snapshot.boardId,
          processedIssues: deserializeProcessedIssues(snapshot.processedIssues as any[]),
          createdAt: snapshot.createdAt,
          source: snapshot.source
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error saving snapshot'
      };
    }
  }

  async listSnapshots(boardId: string): Promise<RepositoryResult<SnapshotMetadata[]>> {
    try {
      const snapshots = await prisma.snapshot.findMany({
        where: { boardId },
        orderBy: { createdAt: 'desc' }
      });

      return {
        success: true,
        data: snapshots.map(s => ({
          snapshotId: s.snapshotId,
          createdAt: s.createdAt,
          source: s.source
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error listing snapshots'
      };
    }
  }

  async getSnapshot(snapshotId: string): Promise<RepositoryResult<SnapshotRecord | null>> {
    try {
      const snapshot = await prisma.snapshot.findUnique({ where: { snapshotId } });
      if (!snapshot) {
        return { success: true, data: null };
      }

      return {
        success: true,
        data: {
          snapshotId: snapshot.snapshotId,
          boardId: snapshot.boardId,
          processedIssues: deserializeProcessedIssues(snapshot.processedIssues as any[]),
          createdAt: snapshot.createdAt,
          source: snapshot.source
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error getting snapshot'
      };
    }
  }
}
