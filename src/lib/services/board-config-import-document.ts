import type { BoardConfig, BoardConfigInput, RepositoryResult } from '../repositories/board-config.types';

export function parseBoardConfigImportDocument(
  importData: unknown
): RepositoryResult<BoardConfigInput> {
  if (!importData || typeof importData !== 'object') {
    return { success: false, error: 'Import data must be a valid object' };
  }

  const data = importData as Record<string, unknown>;

  if (!data.metadata) {
    return { success: false, error: 'Import data must contain metadata' };
  }

  if (!data.workflow) {
    return { success: false, error: 'Import data must contain workflow' };
  }

  const metadata = data.metadata as Record<string, unknown>;

  if (!metadata.boardId) {
    return { success: false, error: 'Metadata must contain boardId' };
  }

  return {
    success: true,
    data: {
      boardId: metadata.boardId as string,
      boardName: (metadata.boardName as string) || '',
      boardType: (metadata.boardType as string) || 'scrum',
      periodDays: (metadata.periodDays as number) || 30,
      workflow: data.workflow as BoardConfig['workflow'],
    },
  };
}
