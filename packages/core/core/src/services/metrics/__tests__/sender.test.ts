import { get } from 'lodash';
import metrics from '../index';

const createMetrics = (fetch: jest.Mock) =>
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
      get: jest.fn(() => ({})),
    },
    cron: {
      add: jest.fn(),
    },
    fetch,
  } as any);

describe('metrics sender', () => {
  test('passes an AbortSignal and no timeout option to fetch', async () => {
    const fetch = jest.fn(() => Promise.resolve({ ok: true }));
    const { send } = createMetrics(fetch);

    await send('someEvent');

    const requestOpts = (fetch.mock.calls[0] as unknown as [string, Record<string, unknown>])[1];
    expect(requestOpts.signal).toBeInstanceOf(AbortSignal);
    expect(requestOpts.timeout).toBe(undefined);
  });

  test('creates a new signal per call so an earlier timeout does not expire later sends', async () => {
    const fetch = jest.fn(() => Promise.resolve({ ok: true }));
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
    const fetch = jest.fn(() =>
      Promise.reject(new DOMException('The operation was aborted due to timeout', 'TimeoutError'))
    );
    const { send } = createMetrics(fetch);

    await expect(send('someEvent')).resolves.toBe(false);
  });
});
