import { describe, expect, it } from 'vitest';

import { compatRateLimitResponse } from '../rate-limit';

const BASE = '/api/auth';

const limited = (body: unknown = { message: 'Too many requests. Please try again later.' }) =>
  new Response(JSON.stringify(body), {
    status: 429,
    headers: { 'content-type': 'application/json', 'x-retry-after': '42' },
  });

describe('compatRateLimitResponse', () => {
  it('answers a limited compat path in the Strapi envelope and keeps the retry header', async () => {
    for (const path of [
      '/local',
      '/local/register',
      '/forgot-password',
      '/refresh',
      '/github/callback',
    ]) {
      // eslint-disable-next-line no-await-in-loop
      const response = await compatRateLimitResponse(limited(), `${BASE}${path}`, BASE);

      expect(response.status).toBe(429);
      expect(response.headers.get('x-retry-after')).toBe('42');
      // eslint-disable-next-line no-await-in-loop
      expect(await response.json()).toEqual({
        data: null,
        error: {
          status: 429,
          name: 'RateLimitError',
          message: 'Too many requests. Please try again later.',
          details: {},
        },
      });
    }
  });

  it('leaves a native path, another status and a path outside the base alone', async () => {
    const native = limited();
    const ok = new Response('{}', { status: 200 });

    expect(await compatRateLimitResponse(native, `${BASE}/sign-in/email`, BASE)).toBe(native);
    expect(await compatRateLimitResponse(ok, `${BASE}/local`, BASE)).toBe(ok);
    expect(await compatRateLimitResponse(native, '/elsewhere/local', BASE)).toBe(native);
  });

  it('answers with a fallback message when the body is not Better Auth’s', async () => {
    const response = await compatRateLimitResponse(
      new Response('slow down', { status: 429 }),
      `${BASE}/local`,
      BASE
    );

    expect(await response.json()).toMatchObject({
      error: { status: 429, name: 'RateLimitError', message: expect.any(String) },
    });
  });
});
