/** @jest-environment node */

import { NextRequest } from 'next/server';
import { POST } from './route';

const originalFetch = global.fetch;
const fetchDouble = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();

describe('POST /api/test-jira-server', () => {
  beforeAll(() => { global.fetch = fetchDouble; });
  beforeEach(() => {
    fetchDouble.mockReset();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-30T12:00:00.000Z'));
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });
  afterAll(() => { global.fetch = originalFetch; });

  it.each([
    [{ auth: 'token' }],
    [{ url: 'https://jira.example.com' }],
    [{ url: 42, auth: 'token' }],
    [{ url: 'https://jira.example.com', auth: ' ' }],
  ])('rejects invalid connection input', async body => {
    const response = await POST(request(body));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ success: false, error: 'URL and auth are required' });
  });

  it('returns connection metadata for a successful Jira response', async () => {
    fetchDouble.mockResolvedValueOnce({
      ok: true, status: 200, statusText: 'OK', json: async () => ({ displayName: 'Flow User' }),
    } as Response);

    const response = await POST(request({ url: 'https://jira.example.com/rest/api/latest/myself', auth: 'secret' }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { displayName: 'Flow User' },
      metadata: {
        status: 200,
        url: 'https://jira.example.com/rest/api/latest/myself',
        timestamp: '2026-08-30T12:00:00.000Z',
      },
    });
  });

  it('maps a Jira rejection to bad gateway', async () => {
    fetchDouble.mockResolvedValueOnce({
      ok: false, status: 401, statusText: 'Unauthorized', text: async () => 'invalid token',
    } as Response);

    const response = await POST(request({ url: 'https://jira.example.com', auth: 'wrong' }));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'Jira Server returned 401: Unauthorized',
      details: 'invalid token',
    });
  });

  it('maps transport failures to internal server error', async () => {
    fetchDouble.mockRejectedValueOnce(new Error('network unavailable'));

    const response = await POST(request({ url: 'https://jira.example.com', auth: 'token' }));

    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({
      success: false,
      error: 'Request failed: network unavailable',
    });
  });
});

function request(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/test-jira-server', {
    method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' },
  });
}
