import type { IBoardConfigRepository } from '@/lib/repositories/board-config.repository';
import { getBoardConfigClient } from '@/lib/repositories/client/board-config-client-factory';
import { TEST_WORKFLOW, mockBoardConfig } from '@/lib/testutils/create-mocks';
import { BoardConfigImportExportService } from '../boardconfig-importexport-service';

jest.mock('@/lib/repositories/client/board-config-client-factory', () => ({
  getBoardConfigClient: jest.fn(),
}));

const mockGetBoardConfigClient = jest.mocked(getBoardConfigClient);

function createRepositoryDouble(): jest.Mocked<IBoardConfigRepository> {
  return {
    save: jest.fn(),
    findByBoardId: jest.fn(),
    findWorkflowByBoardId: jest.fn(),
    listAll: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
  };
}

describe('BoardConfigImportExportService', () => {
  let repository: jest.Mocked<IBoardConfigRepository>;
  let service: BoardConfigImportExportService;

  beforeEach(() => {
    repository = createRepositoryDouble();
    mockGetBoardConfigClient.mockReturnValue(repository);
    service = new BoardConfigImportExportService();
  });

  afterEach(() => jest.restoreAllMocks());

  it('exports metadata and workflow without processed issues', async () => {
    repository.findByBoardId.mockResolvedValue({ success: true, data: mockBoardConfig });

    const result = await service.exportConfig('123');

    expect(repository.findByBoardId).toHaveBeenCalledWith('123');
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
    repository.findByBoardId.mockResolvedValue({ success: true, data: null });

    await expect(service.exportConfig('missing')).resolves.toEqual({
      success: false,
      error: 'Board config not found for boardId: missing',
    });
  });

  it('returns an Error rejection message while exporting', async () => {
    repository.findByBoardId.mockRejectedValue(new Error('storage unavailable'));

    await expect(service.exportConfig('123')).resolves.toEqual({
      success: false,
      error: 'storage unavailable',
    });
  });

  it('imports a valid config through the repository', async () => {
    repository.save.mockResolvedValue({ success: true, data: mockBoardConfig });

    const result = await service.importConfig(mockBoardConfig);

    expect(repository.save).toHaveBeenCalledWith({
      boardId: mockBoardConfig.metadata.boardId,
      boardName: mockBoardConfig.metadata.boardName,
      boardType: mockBoardConfig.metadata.boardType,
      periodDays: mockBoardConfig.metadata.periodDays,
      workflow: TEST_WORKFLOW,
    });
    expect(result).toEqual({ success: true, data: mockBoardConfig });
  });

  it.each([
    [null, 'Import data must be a valid object'],
    [{ workflow: TEST_WORKFLOW }, 'Import data must contain metadata'],
    [{ metadata: { boardId: '123' } }, 'Import data must contain workflow'],
    [{ metadata: {}, workflow: TEST_WORKFLOW }, 'Metadata must contain boardId'],
  ])('rejects invalid import data %#', async (input, error) => {
    await expect(service.importConfig(input)).resolves.toEqual({ success: false, error });
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('passes a repository save failure through unchanged', async () => {
    const failure = { success: false, error: 'storage unavailable' } as const;
    repository.save.mockResolvedValue(failure);

    await expect(service.importConfig(mockBoardConfig)).resolves.toEqual(failure);
  });

  it('returns an Error rejection message while importing', async () => {
    repository.save.mockRejectedValue(new Error('storage unavailable'));

    await expect(service.importConfig(mockBoardConfig)).resolves.toEqual({
      success: false,
      error: 'storage unavailable',
    });
  });
});
