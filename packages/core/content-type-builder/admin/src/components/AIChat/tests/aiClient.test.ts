import { getFetchClient } from '@strapi/admin/strapi-admin';

import { getAIJwt, clearAIJwt, fetchAI } from '../lib/aiClient';

jest.mock('@strapi/admin/strapi-admin', () => ({
  getFetchClient: jest.fn(),
}));

describe('aiClient', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    clearAIJwt();
    sessionStorage.clear();
  });

  test('getAIJwt caches token and uses sessionStorage', async () => {
    (getFetchClient as jest.Mock).mockReturnValue({
      get: jest.fn().mockResolvedValue({
        data: { data: { token: 't1', expiresAt: new Date(Date.now() + 3600_000).toISOString() } },
      }),
    });

    const token1 = await getAIJwt();
    expect(token1?.token).toBe('t1');

    // Second call should not call network again
    const token2 = await getAIJwt();
    expect(token2?.token).toBe('t1');
    expect(getFetchClient().get).toHaveBeenCalledTimes(1);
  });

  test('fetchAI retries once on 401 and succeeds with refreshed token', async () => {
    (getFetchClient as jest.Mock).mockReturnValue({
      get: jest
        .fn()
        // first token
        .mockResolvedValueOnce({
          data: {
            data: { token: 'expired', expiresAt: new Date(Date.now() + 10_000).toISOString() },
          },
        })
        // refreshed token
        .mockResolvedValueOnce({
          data: {
            data: { token: 'fresh', expiresAt: new Date(Date.now() + 10_000).toISOString() },
          },
        }),
    });

    const responses: any[] = [
      new Response(JSON.stringify({ error: 'expired token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ];

    const fetchSpy = jest.spyOn(global, 'fetch' as any).mockImplementation(() => {
      return Promise.resolve(responses.shift());
    });

    const res = await fetchAI('https://strapi.io', { method: 'POST' });
    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
