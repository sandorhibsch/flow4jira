/** @jest-environment node */

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/board-config/snapshots/route';
import { BoardConfigPgRepository } from '@/lib/repositories/board-config.pg.repository';

jest.mock('@/lib/repositories/board-config.pg.repository');

const repository = jest.mocked(BoardConfigPgRepository).mock.instances[0] as jest.Mocked<BoardConfigPgRepository>;

describe('/api/board-config/snapshots', () => {
  beforeEach(() => jest.clearAllMocks());

  it('requires a board ID when listing snapshots', async () => {
    const response = await GET(new NextRequest('http://localhost/api/board-config/snapshots'));
    expect(response.status).toBe(400);
  });

  it('lists snapshots for a board', async () => {
    const snapshots = [{ snapshotId: 'one', createdAt: new Date('2025-01-01'), source: 'manual' }];
    repository.listSnapshots.mockResolvedValue({ success: true, data: snapshots });
    const response = await GET(new NextRequest('http://localhost/api/board-config/snapshots?boardId=42'));
    expect(repository.listSnapshots).toHaveBeenCalledWith('42');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(JSON.parse(JSON.stringify({ success: true, data: snapshots })));
  });

  it('requires snapshot data when saving', async () => {
    const response = await POST(new NextRequest('http://localhost/api/board-config/snapshots', {
      method: 'POST', body: JSON.stringify({ boardId: '42' }),
    }));
    expect(response.status).toBe(400);
  });
});
