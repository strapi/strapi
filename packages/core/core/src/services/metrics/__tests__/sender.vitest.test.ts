import { describe, test, expect, vi, type Mock } from 'vitest';
import metrics from '../index';
import { createConfigProvider } from '../../config';

const createMetrics = (
  fetch: Mock,
  {
    config = createConfigProvider({
      uuid: 'test',
      environment: 'dev',
      info: {
        strapi: '0.0.0',
      },
    }),
    userEmail,
  }: { config?: ReturnType<typeof createConfigProvider>; userEmail?: string } = {}
) =>
  metrics({
    config,
    server: {
      use() {},
    },
    dirs: {
      app: {
        root: process.cwd(),
      },
    },
    has: vi.fn((name: string) => name === 'requestContext'),
    requestContext: {
      get: vi.fn(() => (userEmail === undefined ? {} : { state: { user: { email: userEmail } } })),
    },
    cron: {
      add: vi.fn(),
    },
    fetch,
  } as any);

const getSentBody = (fetch: Mock, callIndex = 0) =>
  JSON.parse((fetch.mock.calls[callIndex] as unknown as [string, { body: string }])[1].body);

describe('metrics sender', () => {
  test('passes an AbortSignal and no timeout option to fetch', async () => {
    const fetch = vi.fn(() => Promise.resolve({ ok: true }));
    const { send } = createMetrics(fetch);

    await send('someEvent');

    const requestOpts = (fetch.mock.calls[0] as unknown as [string, Record<string, unknown>])[1];
    expect(requestOpts.signal).toBeInstanceOf(AbortSignal);
    expect(requestOpts.timeout).toBe(undefined);
  });

  test('creates a new signal per call so an earlier timeout does not expire later sends', async () => {
    const fetch = vi.fn(() => Promise.resolve({ ok: true }));
    const { send } = createMetrics(fetch);

    await send('firstEvent');
    await send('secondEvent');

    const firstSignal = (fetch.mock.calls[0] as unknown as [string, Record<string, unknown>])[1]
      .signal;
    const secondSignal = (fetch.mock.calls[1] as unknown as [string, Record<string, unknown>])[1]
      .signal;
    expect(firstSignal).not.toBe(secondSignal);
  });

  test('returns false instead of throwing when the request is aborted by timeout', async () => {
    const fetch = vi.fn(() =>
      Promise.reject(new DOMException('The operation was aborted due to timeout', 'TimeoutError'))
    );
    const { send } = createMetrics(fetch);

    await expect(send('someEvent')).resolves.toBe(false);
  });

  // Real timers: Node's AbortSignal.timeout uses internal timers that vi.useFakeTimers does not drive
  test('aborts a request still pending after defaultQueryOpts.timeout (1000 ms) and resolves false', async () => {
    const fetch = vi.fn(
      (_url: string, opts: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          opts.signal.addEventListener('abort', () => reject(opts.signal.reason));
        })
    );
    const { send } = createMetrics(fetch);

    const start = performance.now();
    const result = await send('someEvent');
    const elapsed = performance.now() - start;

    expect(result).toBe(false);
    expect(elapsed).toBeGreaterThanOrEqual(950);
    expect(elapsed).toBeLessThan(2000);
  });

  test('sends the config values read at startup', async () => {
    const fetch = vi.fn(() => Promise.resolve({ ok: true }));
    const config = createConfigProvider({
      uuid: 'the-project-id',
      installId: 'the-install-id',
      environment: 'staging',
      packageJsonStrapi: { template: 'blog' },
      info: { strapi: '5.0.0' },
    });
    const { send } = createMetrics(fetch, { config, userEmail: 'admin@example.com' });

    await send('someEvent');

    const body = getSentBody(fetch);
    expect(body.installId).toBe('the-install-id');
    expect(body.userProperties.environment).toBe('staging');
    expect(body.groupProperties).toMatchObject({
      projectId: 'the-project-id',
      version: '5.0.0',
      template: 'blog',
    });
  });

  test('reads config values written with set before the sender is created', async () => {
    const fetch = vi.fn(() => Promise.resolve({ ok: true }));
    const config = createConfigProvider({ uuid: 'stale', info: { strapi: '5.0.0' } });
    config.set('uuid', 'the-project-id');
    config.set('installId', 'the-install-id');
    config.set('environment', 'staging');
    config.set('packageJsonStrapi', { template: 'blog' });
    const { send } = createMetrics(fetch, { config, userEmail: 'admin@example.com' });

    await send('someEvent');

    const body = getSentBody(fetch);
    expect(body.installId).toBe('the-install-id');
    expect(body.userProperties.environment).toBe('staging');
    expect(body.groupProperties).toMatchObject({
      projectId: 'the-project-id',
      template: 'blog',
    });
  });
});
