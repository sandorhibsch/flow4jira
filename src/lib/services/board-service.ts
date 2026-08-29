import type { BoardConfig, BoardConfigInput, BoardConfigMetadata, RepositoryResult } from '@/lib/repositories/board-config.types';
import type { IBoardConfigRepository } from '@/lib/repositories/board-config.repository';

/** Application operations over board configuration ports. */
export class BoardService {
  constructor(private readonly repository: IBoardConfigRepository) {}

  save(input: BoardConfigInput): Promise<RepositoryResult<BoardConfig>> {
    return this.repository.save(input);
  }

  findByBoardId(boardId: string): Promise<RepositoryResult<BoardConfig | null>> {
    return this.repository.findByBoardId(boardId);
  }

  listAll(): Promise<RepositoryResult<BoardConfigMetadata[]>> {
    return this.repository.listAll();
  }

  delete(boardId: string): Promise<RepositoryResult<boolean>> {
    return this.repository.delete(boardId);
  }

  exists(boardId: string): Promise<RepositoryResult<boolean>> {
    return this.repository.exists(boardId);
  }
}
