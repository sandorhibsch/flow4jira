/** @jest-environment node */

import { NextRequest } from 'next/server';
import { DELETE, GET, POST } from '@/app/api/board-config/route';
import { BoardService } from '@/lib/services/board-service';
import { mockBoardConfig, mockBoardConfigInput } from '@/lib/testutils/create-mocks';

jest.mock('@/lib/services/board-service');

const service = jest.mocked(BoardService).mock.instances[0] as jest.Mocked<BoardService>;

describe('/api/board-config', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects GET requests without a boardId', async () => {
    const response = await GET(new NextRequest('http://localhost/api/board-config'));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ success: false, error: 'boardId query parameter required' });
  });

  it('gets a board configuration from the server persistence service', async () => {
    service.findByBoardId.mockResolvedValue({ success: true, data: mockBoardConfig });
    const response = await GET(new NextRequest('http://localhost/api/board-config?boardId=42'));
    expect(service.findByBoardId).toHaveBeenCalledWith('42');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(JSON.parse(JSON.stringify({ success: true, data: mockBoardConfig })));
  });

  it('surfaces persistence failures as a 500 response', async () => {
    service.findByBoardId.mockResolvedValue({ success: false, error: 'database unavailable' });
    const response = await GET(new NextRequest('http://localhost/api/board-config?boardId=42'));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ success: false, error: 'database unavailable' });
  });

  it('saves valid JSON requests through the persistence service', async () => {
    service.save.mockResolvedValue({ success: true, data: mockBoardConfig });
    const response = await POST(new NextRequest('http://localhost/api/board-config', {
      method: 'POST', body: JSON.stringify(mockBoardConfigInput),
    }));
    expect(service.save).toHaveBeenCalledWith(JSON.parse(JSON.stringify(mockBoardConfigInput)));
    expect(response.status).toBe(200);
  });

  it('rejects invalid JSON request bodies', async () => {
    const response = await POST(new NextRequest('http://localhost/api/board-config', {
      method: 'POST', body: '{',
    }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ success: false, error: 'Invalid request body' });
  });

  it('deletes a board configuration through the persistence service', async () => {
    service.delete.mockResolvedValue({ success: true, data: true });
    const response = await DELETE(new NextRequest('http://localhost/api/board-config?boardId=42', { method: 'DELETE' }));
    expect(service.delete).toHaveBeenCalledWith('42');
    expect(response.status).toBe(200);
  });
});
