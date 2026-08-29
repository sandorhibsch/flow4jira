import type { WorkflowDefinition } from '../jira/workflow-config';
import type { IBoardConfigRepository } from '../repositories/board-config.repository';
import type { BoardConfig, BoardConfigInput, BoardConfigMetadata, RepositoryResult } from '../repositories/board-config.types';
import { mockBoardConfig, mockBoardConfigInput } from '../testutils/create-mocks';
import { BoardService } from './board-service';

class BoardRepositoryFake implements IBoardConfigRepository {
  calls: Array<{ operation: string; argument?: unknown }> = [];

  async save(input: BoardConfigInput): Promise<RepositoryResult<BoardConfig>> {
    this.calls.push({ operation: 'save', argument: input });
    return { success: true, data: mockBoardConfig };
  }

  async findByBoardId(boardId: string): Promise<RepositoryResult<BoardConfig | null>> {
    this.calls.push({ operation: 'findByBoardId', argument: boardId });
    return { success: true, data: mockBoardConfig };
  }

  async findWorkflowByBoardId(boardId: string): Promise<RepositoryResult<WorkflowDefinition | null>> {
    this.calls.push({ operation: 'findWorkflowByBoardId', argument: boardId });
    return { success: true, data: mockBoardConfig.workflow };
  }

  async listAll(): Promise<RepositoryResult<BoardConfigMetadata[]>> {
    this.calls.push({ operation: 'listAll' });
    return { success: true, data: [mockBoardConfig.metadata] };
  }

  async delete(boardId: string): Promise<RepositoryResult<boolean>> {
    this.calls.push({ operation: 'delete', argument: boardId });
    return { success: true, data: true };
  }

  async exists(boardId: string): Promise<RepositoryResult<boolean>> {
    this.calls.push({ operation: 'exists', argument: boardId });
    return { success: true, data: true };
  }
}

describe('BoardService', () => {
  let repository: BoardRepositoryFake;
  let service: BoardService;

  beforeEach(() => {
    repository = new BoardRepositoryFake();
    service = new BoardService(repository);
  });

  it('saves through the repository port', async () => {
    await expect(service.save(mockBoardConfigInput)).resolves.toEqual({ success: true, data: mockBoardConfig });
    expect(repository.calls).toEqual([{ operation: 'save', argument: mockBoardConfigInput }]);
  });

  it('finds a board through the repository port', async () => {
    await expect(service.findByBoardId('42')).resolves.toEqual({ success: true, data: mockBoardConfig });
    expect(repository.calls).toEqual([{ operation: 'findByBoardId', argument: '42' }]);
  });

  it('lists boards through the repository port', async () => {
    await expect(service.listAll()).resolves.toEqual({ success: true, data: [mockBoardConfig.metadata] });
    expect(repository.calls).toEqual([{ operation: 'listAll' }]);
  });

  it('deletes through the repository port', async () => {
    await expect(service.delete('42')).resolves.toEqual({ success: true, data: true });
    expect(repository.calls).toEqual([{ operation: 'delete', argument: '42' }]);
  });

  it('checks existence through the repository port', async () => {
    await expect(service.exists('42')).resolves.toEqual({ success: true, data: true });
    expect(repository.calls).toEqual([{ operation: 'exists', argument: '42' }]);
  });
});
