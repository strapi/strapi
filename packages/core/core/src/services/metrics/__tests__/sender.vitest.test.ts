import { describe, test, expect, vi, type Mock } from 'vitest';
import { get } from 'lodash';
import metrics from '../index';

const createMetrics = (fetch: Mock) =>
  metrics({
    config: {
      get(path: string | string[]) {
        return get(this, path);
      },
      uuid: 'test',
      environment: 'dev',
      info: {
        strapi: '0.0.0',
      },
    },
    server: {
      use() {},
    },
    dirs: {
      app: {
        root: process.cwd(),
      },
    },
    requestContext: {
      get: vi.fn(() => ({})),
    },
    cron: {
      add: vi.fn(),
    },
    fetch,
  } as any);

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
});
