import type { Prisma } from '@prisma/client';
import { createMockProcessedIssue, mockBoardConfigInput, TEST_WORKFLOW } from '../testutils/create-mocks';
import { BoardConfigPgRepository, type BoardConfigPrismaGateway } from './board-config.pg.repository';

const updatedAt = new Date('2026-08-29T10:00:00.000Z');
const createdAt = new Date('2026-08-28T10:00:00.000Z');

const boardRow = {
  boardId: '42',
  boardName: 'Delivery',
  boardType: 'kanban',
  periodDays: 60,
  workflow: TEST_WORKFLOW as unknown as Prisma.JsonValue,
  processedIssues: [] as Prisma.JsonValue,
  updatedAt,
};

const snapshotRow = {
  snapshotId: 'snapshot-1',
  boardId: '42',
  processedIssues: [] as Prisma.JsonValue,
  createdAt,
  source: 'scheduled',
};

function createGateway(): BoardConfigPrismaGateway {
  return {
    board: {
      upsert: jest.fn().mockResolvedValue(boardRow),
      findUnique: jest.fn().mockResolvedValue(boardRow),
      findMany: jest.fn().mockResolvedValue([boardRow]),
      delete: jest.fn().mockResolvedValue(boardRow),
    },
    snapshot: {
      create: jest.fn().mockResolvedValue(snapshotRow),
      findMany: jest.fn().mockResolvedValue([snapshotRow]),
      findUnique: jest.fn().mockResolvedValue(snapshotRow),
    },
  };
}

describe('BoardConfigPgRepository', () => {
  let gateway: BoardConfigPrismaGateway;
  let repository: BoardConfigPgRepository;

  beforeEach(() => {
    gateway = createGateway();
    repository = new BoardConfigPgRepository(gateway);
  });

  it('upserts persistence data and maps the stored board', async () => {
    await expect(repository.save({ ...mockBoardConfigInput, boardId: '42' })).resolves.toEqual({
      success: true,
      data: {
        metadata: { boardId: '42', boardName: 'Delivery', boardType: 'kanban', periodDays: 60, updatedAt },
        workflow: TEST_WORKFLOW,
        processedIssues: [],
      },
    });

    expect(gateway.board.upsert).toHaveBeenCalledWith({
      where: { boardId: '42' },
      update: expect.objectContaining({ workflow: TEST_WORKFLOW }),
      create: expect.objectContaining({ boardId: '42', workflow: TEST_WORKFLOW }),
    });
  });

  it('returns null when a board is absent', async () => {
    jest.mocked(gateway.board.findUnique).mockResolvedValueOnce(null);

    await expect(repository.findByBoardId('missing')).resolves.toEqual({ success: true, data: null });
    expect(gateway.board.findUnique).toHaveBeenCalledWith({ where: { boardId: 'missing' } });
  });

  it('reads only the workflow through the gateway', async () => {
    await expect(repository.findWorkflowByBoardId('42')).resolves.toEqual({ success: true, data: TEST_WORKFLOW });
  });

  it('lists board metadata in repository order', async () => {
    await expect(repository.listAll()).resolves.toEqual({
      success: true,
      data: [{ boardId: '42', boardName: 'Delivery', boardType: 'kanban', periodDays: 60, updatedAt }],
    });
    expect(gateway.board.findMany).toHaveBeenCalledWith({ orderBy: { updatedAt: 'desc' } });
  });

  it('deletes and checks board existence through the gateway', async () => {
    await expect(repository.delete('42')).resolves.toEqual({ success: true, data: true });
    await expect(repository.exists('42')).resolves.toEqual({ success: true, data: true });
    expect(gateway.board.delete).toHaveBeenCalledWith({ where: { boardId: '42' } });
  });

  it('maps gateway failures to repository failures', async () => {
    jest.mocked(gateway.board.upsert).mockRejectedValueOnce(new Error('database unavailable'));

    await expect(repository.save(mockBoardConfigInput)).resolves.toEqual({
      success: false,
      error: 'database unavailable',
    });
  });

  it('creates a snapshot with the requested source', async () => {
    const issue = createMockProcessedIssue();

    await expect(repository.saveSnapshot('42', [issue], 'scheduled')).resolves.toEqual({
      success: true,
      data: { snapshotId: 'snapshot-1', boardId: '42', processedIssues: [], createdAt, source: 'scheduled' },
    });
    expect(gateway.snapshot.create).toHaveBeenCalledWith({
      data: { boardId: '42', processedIssues: expect.any(Array), source: 'scheduled' },
    });
  });

  it('lists snapshot metadata newest first', async () => {
    await expect(repository.listSnapshots('42')).resolves.toEqual({
      success: true,
      data: [{ snapshotId: 'snapshot-1', createdAt, source: 'scheduled' }],
    });
    expect(gateway.snapshot.findMany).toHaveBeenCalledWith({
      where: { boardId: '42' },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('returns null when a snapshot is absent', async () => {
    jest.mocked(gateway.snapshot.findUnique).mockResolvedValueOnce(null);

    await expect(repository.getSnapshot('missing')).resolves.toEqual({ success: true, data: null });
  });
});
