import { getBoardMetricsService } from './board-metrics-service-factory';
import {
  getBoardConfigClient,
  isServerPersistenceMode
} from '@/lib/repositories/client/board-config-client-factory';
import { getJiraConfigFromLocalStorage } from '@/lib/repositories/jira-config.local.repository';
import { createBoardConfig } from '@/lib/testutils/create-mocks';

jest.mock('@/lib/repositories/client/board-config-client-factory', () => ({
  getBoardConfigClient: jest.fn(),
  isServerPersistenceMode: jest.fn()
}));
jest.mock('@/lib/repositories/jira-config.local.repository', () => ({
  getJiraConfigFromLocalStorage: jest.fn()
}));

describe('board metrics browser wiring', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it.each([true, false])(
    'selects credentials at the adapter boundary (server=%s)',
    async (server) => {
      const board = createBoardConfig();
      const fetchResponse = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { issues: [] } })
      });
      globalThis.fetch = fetchResponse;
      const credentials = {
        instanceType: 'server' as const,
        baseUrl: 'https://jira.example.com',
        bearerToken: 'test-token'
      };
      jest.mocked(isServerPersistenceMode).mockReturnValue(server);
      jest.mocked(getJiraConfigFromLocalStorage).mockReturnValue(credentials);
      const repository = {
        findByBoardId: jest.fn(),
        save: jest.fn().mockResolvedValue({ success: true, data: board })
      };
      jest
        .mocked(getBoardConfigClient)
        .mockReturnValue(repository as unknown as ReturnType<typeof getBoardConfigClient>);
      await getBoardMetricsService().refresh(board, 30);
      const body = JSON.parse(fetchResponse.mock.calls[0]![1].body);
      expect(body).toEqual({
        boardId: board.metadata.boardId,
        periodDays: 30,
        ...(server ? {} : { config: credentials })
      });
      expect(getJiraConfigFromLocalStorage).toHaveBeenCalledTimes(server ? 0 : 1);
    }
  );
});
