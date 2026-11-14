import type { JiraIssue } from '@/lib/jira/jira-types';
import { JiraBoardIssueProvider } from './jira-board-issue-provider';

const jiraIssue = { key: 'DEL-1' } as JiraIssue;

describe('JiraBoardIssueProvider', () => {
  it('rejects a failed HTTP response even if its body claims success', async () => {
    const provider = new JiraBoardIssueProvider(
      jest.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ success: true, data: { issues: [] } })
      })
    );
    await expect(provider.fetchIssues({ boardId: '42', periodDays: 30 })).resolves.toEqual({
      success: false,
      error: 'Failed to fetch issues'
    });
  });

  it('rejects a success response without an issue collection', async () => {
    const provider = new JiraBoardIssueProvider(
      jest.fn().mockResolvedValue(response({ success: true, data: {} }))
    );
    await expect(provider.fetchIssues({ boardId: '42', periodDays: 30 })).resolves.toEqual({
      success: false,
      error: 'Failed to fetch issues'
    });
  });

  it('lets the application normalize unreadable response bodies', async () => {
    const error = new SyntaxError('Invalid JSON');
    const provider = new JiraBoardIssueProvider(
      jest.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw error;
        }
      })
    );
    await expect(provider.fetchIssues({ boardId: '42', periodDays: 30 })).rejects.toBe(error);
  });

  it('invokes the browser fetch function without changing its receiver', async () => {
    const originalFetch = globalThis.fetch;
    const browserFetch = jest.fn(function (this: unknown) {
      if (this !== undefined) {
        throw new TypeError('Illegal invocation');
      }
      return Promise.resolve(response({ success: true, data: { issues: [] } }) as Response);
    });
    globalThis.fetch = browserFetch as typeof fetch;

    try {
      const provider = new JiraBoardIssueProvider();

      await expect(provider.fetchIssues({ boardId: '42', periodDays: 30 })).resolves.toEqual({
        success: true,
        data: []
      });
      expect(browserFetch).toHaveBeenCalledTimes(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('decodes issues from a successful response', async () => {
    const fetchResponse = jest.fn().mockResolvedValue(
      response({
        success: true,
        data: { issues: [jiraIssue] }
      })
    );
    const provider = new JiraBoardIssueProvider(fetchResponse);

    await expect(
      provider.fetchIssues({
        boardId: '42',
        periodDays: 30
      })
    ).resolves.toEqual({ success: true, data: [jiraIssue] });
  });

  it('serializes the board query as a JSON POST', async () => {
    const fetchResponse = jest
      .fn()
      .mockResolvedValue(response({ success: true, data: { issues: [] } }));
    await new JiraBoardIssueProvider(fetchResponse).fetchIssues({ boardId: '42', periodDays: 30 });
    expect(fetchResponse).toHaveBeenCalledWith('/api/flow/board', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boardId: '42', periodDays: 30 })
    });
  });

  it('returns an API failure reason', async () => {
    const provider = new JiraBoardIssueProvider(
      jest.fn().mockResolvedValue(
        response({
          success: false,
          error: 'Jira rejected the query'
        })
      )
    );

    await expect(provider.fetchIssues({ boardId: '42', periodDays: 30 })).resolves.toEqual({
      success: false,
      error: 'Jira rejected the query'
    });
  });

  it('uses a stable fallback when an unsuccessful response has no reason', async () => {
    const provider = new JiraBoardIssueProvider(
      jest.fn().mockResolvedValue(
        response({
          success: false
        })
      )
    );

    await expect(provider.fetchIssues({ boardId: '42', periodDays: 30 })).resolves.toEqual({
      success: false,
      error: 'Failed to fetch issues'
    });
  });
});

function response(body: unknown): Pick<Response, 'json' | 'ok'> {
  return { ok: true, json: async () => body };
}
