import { afterEach, describe, expect, it, vi } from 'vitest';

import { callCompat } from '../call-compat';

afterEach(() => {
  vi.unstubAllGlobals();
});

const setup = (answer: Response, methods: Record<string, boolean> = { emailPassword: true }) => {
  const handle = vi.fn<(request: Request) => Promise<Response>>(async () => answer);
  const engine = { handle };
  const config: Record<string, unknown> = { 'server.url': 'http://localhost:1337' };

  vi.stubGlobal('strapi', {
    config: { get: (key: string) => config[key] },
    plugin: () => ({
      service: (name: string) =>
        name === 'settings'
          ? { get: async () => ({ methods }) }
          : { ensureCurrent: async () => undefined, get: () => engine },
    }),
  });

  const ctx = {
    append: vi.fn(),
    request: {
      ip: '203.0.113.7',
      headers: {
        authorization: 'Bearer abc',
        origin: 'http://localhost:5173',
        'x-forwarded-for': '198.51.100.1',
        'content-length': '99',
      },
    },
  } as never;

  return { handle, ctx };
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('callCompat', () => {
  it("forwards the caller's headers and throws the envelope's message", async () => {
    const { handle, ctx } = setup(
      json(
        {
          data: null,
          error: {
            status: 403,
            name: 'ForbiddenError',
            message: 'Account locked',
            details: { code: 'ACCOUNT_LOCKED' },
          },
        },
        403
      )
    );

    await expect(
      callCompat(ctx, '/local', { identifier: 'a', password: 'b' })
    ).rejects.toMatchObject({
      name: 'ApplicationError',
      message: 'Account locked',
      details: { status: 403, code: 'ACCOUNT_LOCKED' },
    });

    const request = handle.mock.calls[0][0];

    expect(request.method).toBe('POST');
    expect(request.url).toBe('http://localhost:1337/api/auth/local');
    expect(request.headers.get('authorization')).toBe('Bearer abc');
    expect(request.headers.get('origin')).toBe('http://localhost:5173');
    expect(request.headers.get('content-type')).toBe('application/json');
    // The client address is the one Strapi sees, not the one the client wrote
    expect(request.headers.get('x-forwarded-for')).toBe('203.0.113.7');
    expect(await request.json()).toEqual({ identifier: 'a', password: 'b' });
  });

  it('hands the cookies of the answer to the client, the refresh cookie of a login included', async () => {
    const answer = new Response(JSON.stringify({ jwt: 'token', user: { id: 1 } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

    answer.headers.append('set-cookie', 'strapi_up_refresh=abc; Path=/; HttpOnly');

    const { ctx } = setup(answer);

    await callCompat(ctx, '/local', {});

    expect((ctx as unknown as { append: ReturnType<typeof vi.fn> }).append).toHaveBeenCalledWith(
      'Set-Cookie',
      ['strapi_up_refresh=abc; Path=/; HttpOnly']
    );
  });

  it('sets no cookie when the answer has none', async () => {
    const { ctx } = setup(json({ jwt: 'token', user: { id: 1 } }));

    await callCompat(ctx, '/local', {});

    expect((ctx as unknown as { append: ReturnType<typeof vi.fn> }).append).not.toHaveBeenCalled();
  });

  it('returns the parsed body of an answer', async () => {
    const { ctx } = setup(json({ jwt: 'token', user: { id: 1 } }));

    expect(await callCompat(ctx, '/local', {})).toEqual({ jwt: 'token', user: { id: 1 } });
  });

  it("uses the message of a refusal that is not Strapi's envelope, such as a rate limit", async () => {
    const { ctx } = setup(json({ message: 'Too many requests. Please try again later.' }, 429));

    await expect(callCompat(ctx, '/local', {})).rejects.toMatchObject({
      message: 'Too many requests. Please try again later.',
      details: { status: 429 },
    });
  });

  it('refuses an endpoint of a sign-in method that is turned off, as the REST route does, without calling the engine', async () => {
    const { handle, ctx } = setup(json({ ok: true }), { emailPassword: false });

    await expect(callCompat(ctx, '/reset-password', {})).rejects.toMatchObject({
      message: 'Not Found',
      details: { status: 404 },
    });
    expect(handle).not.toHaveBeenCalled();
  });

  it('lets the endpoint through while its method is on', async () => {
    const { handle, ctx } = setup(json({ ok: true }));

    await callCompat(ctx, '/reset-password', {});

    expect(handle).toHaveBeenCalledTimes(1);
  });
});
