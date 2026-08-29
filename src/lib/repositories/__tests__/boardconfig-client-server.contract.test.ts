import { mockBoardConfig, mockBoardConfigInput } from '@/lib/testutils/create-mocks';
import { BoardConfigClientServer } from '../client/boardconfig-client-server';

function httpResponse(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

describe('BoardConfigClientServer REST contract', () => {
  let fetcher: jest.MockedFunction<typeof fetch>;
  let client: BoardConfigClientServer;

  beforeEach(() => {
    fetcher = jest.fn();
    client = new BoardConfigClientServer(fetcher);
  });

  it('serializes processed issues and posts a board config', async () => {
    fetcher.mockResolvedValueOnce(httpResponse({ success: true, data: mockBoardConfig }));

    await client.save(mockBoardConfigInput);

    const [, request] = fetcher.mock.calls[0]!;
    expect(fetcher.mock.calls[0]?.[0]).toBe('/api/board-config');
    expect(request).toMatchObject({ method: 'POST', headers: { 'Content-Type': 'application/json' } });
    const body = JSON.parse(request?.body as string);
    expect(body.processedIssues[0].created).toBe(mockBoardConfigInput.processedIssues?.[0]?.created.toISOString());
  });

  it('deserializes issue dates returned by the API', async () => {
    const apiBoard = {
      ...mockBoardConfig,
      processedIssues: [{
        ...mockBoardConfig.processedIssues?.[0],
        created: '2026-08-01T00:00:00.000Z',
        flowHistory: [{
          stage: mockBoardConfig.workflow.stages[0],
          jiraStatus: 'Backlog',
          enteredAt: '2026-08-01T00:00:00.000Z',
        }],
      }],
    };
    fetcher.mockResolvedValueOnce(httpResponse({ success: true, data: apiBoard }));

    const result = await client.findByBoardId('a board/id');

    expect(fetcher).toHaveBeenCalledWith('/api/board-config?boardId=a%20board%2Fid');
    expect(result.success && result.data?.processedIssues?.[0]?.flowHistory[0]?.enteredAt).toEqual(new Date('2026-08-01T00:00:00.000Z'));
  });

  it('derives a workflow result from the board endpoint', async () => {
    fetcher.mockResolvedValueOnce(httpResponse({ success: true, data: mockBoardConfig }));

    await expect(client.findWorkflowByBoardId('42')).resolves.toEqual({ success: true, data: mockBoardConfig.workflow });
  });

  it.each([
    ['listAll', [], '/api/board-config/list', undefined],
    ['delete', ['a board/id'], '/api/board-config?boardId=a%20board%2Fid', { method: 'DELETE' }],
    ['exists', ['a board/id'], '/api/board-config/exists?boardId=a%20board%2Fid', undefined],
  ] as const)('maps %s to its REST resource', async (method, args, path, request) => {
    fetcher.mockResolvedValueOnce(httpResponse({ success: true, data: [] }));

    await (client[method] as (...methodArgs: typeof args) => Promise<unknown>)(...args);

    if (request) expect(fetcher).toHaveBeenCalledWith(path, request);
    else expect(fetcher).toHaveBeenCalledWith(path);
  });

  it('returns application errors from a successful HTTP response', async () => {
    fetcher.mockResolvedValueOnce(httpResponse({ success: false, error: 'invalid board' }));

    await expect(client.findByBoardId('42')).resolves.toEqual({ success: false, error: 'invalid board' });
  });

  it.each([
    [httpResponse({}, 503), 'API returned 503'],
    [new Error('network unavailable'), 'network unavailable'],
  ])('translates transport failure %#', async (failure, error) => {
    if (failure instanceof Error) fetcher.mockRejectedValueOnce(failure);
    else fetcher.mockResolvedValueOnce(failure);

    await expect(client.listAll()).resolves.toEqual({ success: false, error });
  });
});
