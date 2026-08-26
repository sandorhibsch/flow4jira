import type { IBoardConfigRepository } from '@/lib/repositories/board-config.repository';
import type { BoardConfig, BoardConfigInput, BoardConfigMetadata, RepositoryResult } from '@/lib/repositories/board-config.types';
import type { WorkflowDefinition } from '@/lib/jira/workflow-config';
import { TEST_WORKFLOW, mockBoardConfig } from '@/lib/testutils/create-mocks';
import { BoardConfigImportExportService } from '../boardconfig-importexport-service';

class RecordingBoardConfigRepository implements IBoardConfigRepository {
  savedInputs: BoardConfigInput[] = [];
  requestedBoardIds: string[] = [];
  saveResult: RepositoryResult<BoardConfig> = { success: true, data: mockBoardConfig };
  findResult: RepositoryResult<BoardConfig | null> = { success: true, data: mockBoardConfig };
  saveError?: unknown;
  findError?: unknown;

  async save(input: BoardConfigInput): Promise<RepositoryResult<BoardConfig>> {
    this.savedInputs.push(input);
    if (this.saveError) throw this.saveError;
    return this.saveResult;
  }

  async findByBoardId(boardId: string): Promise<RepositoryResult<BoardConfig | null>> {
    this.requestedBoardIds.push(boardId);
    if (this.findError) throw this.findError;
    return this.findResult;
  }

  async findWorkflowByBoardId(): Promise<RepositoryResult<WorkflowDefinition | null>> {
    throw new Error('Unexpected collaborator call: findWorkflowByBoardId');
  }

  async listAll(): Promise<RepositoryResult<BoardConfigMetadata[]>> {
    throw new Error('Unexpected collaborator call: listAll');
  }

  async delete(): Promise<RepositoryResult<boolean>> {
    throw new Error('Unexpected collaborator call: delete');
  }

  async exists(): Promise<RepositoryResult<boolean>> {
    throw new Error('Unexpected collaborator call: exists');
  }
}

describe('BoardConfigImportExportService', () => {
  let repository: RecordingBoardConfigRepository;
  let service: BoardConfigImportExportService;

  beforeEach(() => {
    repository = new RecordingBoardConfigRepository();
    service = new BoardConfigImportExportService(repository);
  });

  it('exports metadata and workflow without processed issues', async () => {
    const result = await service.exportConfig('123');

    expect(repository.requestedBoardIds).toEqual(['123']);
    expect(result).toEqual({
      success: true,
      data: {
        metadata: {
          ...mockBoardConfig.metadata,
          updatedAt: mockBoardConfig.metadata.updatedAt.toISOString(),
        },
        workflow: TEST_WORKFLOW,
      },
    });
  });

  it('returns failure when the board does not exist', async () => {
    repository.findResult = { success: true, data: null };

    await expect(service.exportConfig('missing')).resolves.toEqual({
      success: false,
      error: 'Board config not found for boardId: missing',
    });
  });

  it('returns an Error rejection message while exporting', async () => {
    repository.findError = new Error('storage unavailable');

    await expect(service.exportConfig('123')).resolves.toEqual({
      success: false,
      error: 'storage unavailable',
    });
  });

  it('imports a valid config through the repository', async () => {
    const result = await service.importConfig(mockBoardConfig);

    expect(repository.savedInputs).toEqual([{
      boardId: mockBoardConfig.metadata.boardId,
      boardName: mockBoardConfig.metadata.boardName,
      boardType: mockBoardConfig.metadata.boardType,
      periodDays: mockBoardConfig.metadata.periodDays,
      workflow: TEST_WORKFLOW,
    }]);
    expect(result).toEqual({ success: true, data: mockBoardConfig });
  });

  it.each([
    [null, 'Import data must be a valid object'],
    [{ workflow: TEST_WORKFLOW }, 'Import data must contain metadata'],
    [{ metadata: { boardId: '123' } }, 'Import data must contain workflow'],
    [{ metadata: {}, workflow: TEST_WORKFLOW }, 'Metadata must contain boardId'],
  ])('rejects invalid import data %#', async (input, error) => {
    await expect(service.importConfig(input)).resolves.toEqual({ success: false, error });
    expect(repository.savedInputs).toEqual([]);
  });

  it('passes a repository save failure through unchanged', async () => {
    const failure = { success: false, error: 'storage unavailable' } as const;
    repository.saveResult = failure;

    await expect(service.importConfig(mockBoardConfig)).resolves.toEqual(failure);
  });

  it('returns an Error rejection message while importing', async () => {
    repository.saveError = new Error('storage unavailable');

    await expect(service.importConfig(mockBoardConfig)).resolves.toEqual({
      success: false,
      error: 'storage unavailable',
    });
  });
});
