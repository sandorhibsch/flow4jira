/** @jest-environment node */

import { NextRequest } from 'next/server';
import { GET as getExists } from '@/app/api/board-config/exists/route';
import { POST as importConfig } from '@/app/api/board-config/import/route';
import { GET as list } from '@/app/api/board-config/list/route';
import { BoardService } from '@/lib/services/board-service';
import { mockBoardConfig } from '@/lib/testutils/create-mocks';

jest.mock('@/lib/services/board-service');

const [existsService, importService, listService] = jest.mocked(BoardService).mock.instances as [
  jest.Mocked<BoardService>,
  jest.Mocked<BoardService>,
  jest.Mocked<BoardService>,
];

describe('auxiliary board-config API routes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('validates the board ID for the exists endpoint', async () => {
    const response = await getExists(new NextRequest('http://localhost/api/board-config/exists'));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ success: false, error: 'boardId query parameter required' });
  });

  it('returns a board existence check from Postgres', async () => {
    existsService.exists.mockResolvedValue({ success: true, data: true });
    const response = await getExists(new NextRequest('http://localhost/api/board-config/exists?boardId=42'));
    expect(existsService.exists).toHaveBeenCalledWith('42');
    await expect(response.json()).resolves.toEqual({ success: true, data: true });
  });

  it('returns persistence failures from the list endpoint as HTTP 500', async () => {
    listService.listAll.mockResolvedValue({ success: false, error: 'database unavailable' });
    const response = await list(new NextRequest('http://localhost/api/board-config/list'));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ success: false, error: 'database unavailable' });
  });

  it('imports a JSON configuration through the persistence service', async () => {
    importService.importConfig.mockResolvedValue({ success: true, data: mockBoardConfig });
    const body = { metadata: { boardId: '42' }, workflow: mockBoardConfig.workflow };
    const response = await importConfig(new NextRequest('http://localhost/api/board-config/import', {
      method: 'POST', body: JSON.stringify(body),
    }));
    expect(importService.importConfig).toHaveBeenCalledWith(body);
    expect(response.status).toBe(200);
  });

  it('rejects malformed import JSON', async () => {
    const response = await importConfig(new NextRequest('http://localhost/api/board-config/import', {
      method: 'POST', body: '{',
    }));
    expect(response.status).toBe(400);
  });
});
