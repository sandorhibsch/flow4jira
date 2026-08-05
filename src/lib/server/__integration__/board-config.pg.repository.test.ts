/**
 * @jest-environment node
 */

import { BoardConfigPgRepository } from '@/lib/repositories/board-config.pg.repository';
import prisma from '@/lib/server/db/prisma-client';
import { TEST_WORKFLOW, createMockProcessedIssue } from '@/lib/testutils/create-mocks';

/**
 * Integration tests for Postgres repository.
 * Requires DATABASE_URL pointing to a test database.
 * Setup: pnpm run test:db:up && DATABASE_URL=postgresql://postgres:postgres@localhost:5433/flow4jira_test pnpm exec prisma migrate deploy
 */

describe('BoardConfigPgRepository', () => {
  let repo: BoardConfigPgRepository;

  beforeAll(() => {
    repo = new BoardConfigPgRepository();
  });

  afterEach(async () => {
    // Clean up: delete all boards
    await prisma.board.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('saves and retrieves a board config', async () => {
    const input = {
      boardId: 'test-1',
      boardName: 'Test Board',
      boardType: 'kanban' as const,
      periodDays: 30,
      workflow: TEST_WORKFLOW,
      processedIssues: [
        createMockProcessedIssue()
      ]
    };

    const saveRes = await repo.save(input);
    expect(saveRes.success).toBe(true);
    if (!saveRes.success) throw new Error(`Save failed: ${saveRes.error}`);
    expect(saveRes.data.metadata.boardId).toBe('test-1');

    const findRes = await repo.findByBoardId('test-1');
    expect(findRes.success).toBe(true);
    if (!findRes.success) throw new Error(`Find failed: ${findRes.error}`);
    else {
      expect(findRes.data?.metadata.boardName).toBe('Test Board');
      expect(findRes.data?.workflow).toEqual(input.workflow);
    }

  });

  test('lists all boards', async () => {
    await repo.save({
      boardId: 'b1',
      boardName: 'Board 1',
      boardType: 'scrum' as const,
      periodDays: 30,
      workflow: TEST_WORKFLOW,
      processedIssues: []
    });
    await repo.save({
      boardId: 'b2',
      boardName: 'Board 2',
      boardType: 'kanban' as const,
      periodDays: 14,
      workflow: TEST_WORKFLOW,
      processedIssues: []
    });

    const listRes = await repo.listAll();
    expect(listRes.success).toBe(true);
    if (listRes.success) {
      expect(listRes.data?.length).toBe(2);
    }

  });

  test('deletes a board', async () => {
    await repo.save({
      boardId: 'del-test',
      boardName: 'Delete Me',
      boardType: 'scrum' as const,
      periodDays: 30,
      workflow: TEST_WORKFLOW,
      processedIssues: []
    });

    const delRes = await repo.delete('del-test');
    expect(delRes.success).toBe(true);

    const findRes = await repo.findByBoardId('del-test');
    expect(findRes.success).toBe(true);
    if (findRes.success) {
      expect(findRes.data).toBeNull();
    }
  });

  test('saves and lists snapshots', async () => {
    await repo.save({
      boardId: 'snap-1',
      boardName: 'Snap Board',
      boardType: 'scrum' as const,
      periodDays: 30,
      workflow: TEST_WORKFLOW,
      processedIssues: []
    });

    const issues1 = [
      createMockProcessedIssue()
    ];

    const snapRes = await repo.saveSnapshot('snap-1', issues1);
    expect(snapRes.success).toBe(true);

    const listRes = await repo.listSnapshots('snap-1');
    expect(listRes.success).toBe(true);
    if (listRes.success) {
      expect(listRes.data?.length).toBeGreaterThan(0);
    }

  });
});