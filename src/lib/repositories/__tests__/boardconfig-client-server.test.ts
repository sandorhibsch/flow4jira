import { BoardConfigClientServer } from '../client/boardconfig-client-server';
import {
  serializeProcessedIssues,
  deserializeProcessedIssues,
} from '@/lib/serializers/processed-issue.serializer';
import { mockBoardConfig, mockBoardConfigInput } from '@/lib/testutils/create-mocks';

jest.mock('@/lib/serializers/processed-issue.serializer', () => ({
  serializeProcessedIssues: jest.fn((issues: any[]) => issues),
  deserializeProcessedIssues: jest.fn((raw: any[]) => raw),
}));

const mockFetch = jest.fn();

describe('BoardConfigClientServer', () => {

  const apiResponse = {
    success: true,
    data: {
      ...mockBoardConfig,
      processedIssues: [
        {
          key: 'P-1',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-02T00:00:00.000Z',
          flowHistory: [],
        },
      ],
    },
  };

  beforeEach(() => {
    (global as any).fetch = mockFetch;
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete (global as any).fetch;
  });

  it('save() posts to /api/board-config and deserializes returned processedIssues', async () => {

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => apiResponse,
    });

    const repo = new BoardConfigClientServer();
    const result = await repo.save(mockBoardConfigInput);

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/board-config',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.any(String),
      }),
    );
    expect(serializeProcessedIssues).toHaveBeenCalledWith(
      mockBoardConfigInput.processedIssues,
    );
    expect(deserializeProcessedIssues).toHaveBeenCalledWith(
      apiResponse.data.processedIssues,
    );
    expect(result).toEqual(apiResponse);
  });

  it('findByBoardId() requests the board config from the API and deserializes processedIssues', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => apiResponse,
    });

    const repo = new BoardConfigClientServer();
    const result = await repo.findByBoardId('123');

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/board-config?boardId=123'
    );
    expect(deserializeProcessedIssues).toHaveBeenCalledWith(
      apiResponse.data.processedIssues,
    );
    expect(result).toEqual(apiResponse);
  });

  it('returns the API failure when saving fails instead of persisting locally', async () => {
    mockFetch.mockRejectedValue(new Error('network error'));

    const repo = new BoardConfigClientServer();
    const result = await repo.save(mockBoardConfigInput);

    expect(result).toEqual({ success: false, error: 'network error' });
  });

  it.each([
    ['listAll', [], '/api/board-config/list'],
    ['delete', ['a board/id'], '/api/board-config?boardId=a%20board%2Fid'],
    ['exists', ['a board/id'], '/api/board-config/exists?boardId=a%20board%2Fid'],
  ] as const)('%s() returns an API error when the request fails', async (method, args, path) => {
    mockFetch.mockResolvedValue({ ok: false, status: 503, json: async () => ({}) });

    const repo = new BoardConfigClientServer();
    const result = await (repo[method] as (...methodArgs: typeof args) => Promise<unknown>)(...args);

    expect(mockFetch.mock.calls[0][0]).toBe(path);
    expect(result).toEqual({ success: false, error: 'API returned 503' });
  });

  it('findWorkflowByBoardId() returns only the workflow from the API result', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => apiResponse });

    const repo = new BoardConfigClientServer();
    const result = await repo.findWorkflowByBoardId('123');

    expect(result).toEqual({ success: true, data: apiResponse.data.workflow });
  });
});
