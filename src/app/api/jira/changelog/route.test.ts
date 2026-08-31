/** @jest-environment node */

import { NextRequest } from 'next/server';
import { POST } from './route';
import { JiraClientFactory } from '@/lib/jira/jira-client-factory';

jest.mock('@/lib/jira/jira-client-factory');

const getIssueWithChangelog = jest.fn();

describe('POST /api/jira/changelog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(JiraClientFactory.createConfigFromEnv).mockReturnValue({
      instanceType: 'server', baseUrl: 'https://jira.example.com', bearerToken: 'token',
    });
    jest.mocked(JiraClientFactory.create).mockReturnValue({ getIssueWithChangelog } as never);
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  it.each([
    [{ issueKeys: 'FLOW-1' }],
    [{ issueKeys: ['FLOW-1', ''] }],
    [{ issueKeys: ['FLOW-1', 2] }],
  ])('rejects an invalid issue key collection', async body => {
    const response = await POST(request(body));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'issueKeys must be an array of non-empty strings',
    });
  });

  it('returns partial results and summary metadata', async () => {
    getIssueWithChangelog
      .mockResolvedValueOnce({ key: 'FLOW-1', changelog: { histories: [] } })
      .mockRejectedValueOnce(new Error('not permitted'));

    const response = await POST(request({ issueKeys: ['FLOW-1', 'FLOW-2'] }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: [
        { issueKey: 'FLOW-1', changelog: { key: 'FLOW-1', changelog: { histories: [] } } },
        { issueKey: 'FLOW-2', error: 'not permitted' },
      ],
      metadata: { totalRequested: 2, successful: 1, failed: 1 },
    });
  });

  it('maps malformed JSON to an internal request failure', async () => {
    const response = await POST(new NextRequest('http://localhost/api/jira/changelog', {
      method: 'POST', body: '{', headers: { 'Content-Type': 'application/json' },
    }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Failed to fetch changelogs' });
  });
});

function request(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/jira/changelog', {
    method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' },
  });
}
