import { WorkflowDefinition } from "../../jira/workflow-config";
import { BoardConfigLocalRepository } from "../board-config.local.repository";
import { IBoardConfigRepository } from "../board-config.repository";
import { BoardConfig, BoardConfigInput, RepositoryResult, BoardConfigMetadata } from "../board-config.types";

export class BoardConfigClientLocal implements IBoardConfigRepository {

  constructor(private localRepository: IBoardConfigRepository = new BoardConfigLocalRepository()) { }

  save(input: BoardConfigInput): Promise<RepositoryResult<BoardConfig>> {
    return this.localRepository.save(input);
  }

  findByBoardId(boardId: string): Promise<RepositoryResult<BoardConfig | null>> {
    return this.localRepository.findByBoardId(boardId);
  }

  findWorkflowByBoardId(boardId: string): Promise<RepositoryResult<WorkflowDefinition | null>> {
    return this.localRepository.findWorkflowByBoardId(boardId);
  }

  listAll(): Promise<RepositoryResult<BoardConfigMetadata[]>> {
    return this.localRepository.listAll();
  }

  delete(boardId: string): Promise<RepositoryResult<boolean>> {
    return this.localRepository.delete(boardId);
  }

  exists(boardId: string): Promise<RepositoryResult<boolean>> {
    return this.localRepository.exists(boardId);
  }
}