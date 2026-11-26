import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { watchServerRestart } from '../watchServerRestart';

const status = (isUpdating: boolean) => Promise.resolve({ data: { data: { isUpdating } } });

/** A request the server accepts and never answers: it only settles when it is aborted. */
const unanswered = (_url: string, { signal }: { signal: AbortSignal }) =>
  new Promise<never>((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('aborted')));
  });

describe('watchServerRestart', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('resolves once the server no longer reports a schema update', async () => {
    const get = vi
      .fn()
      .mockImplementationOnce(() => status(true))
      .mockImplementationOnce(() => status(false));

    const watching = watchServerRestart(get);
    await vi.advanceTimersByTimeAsync(200);

    await expect(watching).resolves.toBeUndefined();
    expect(get).toHaveBeenCalledTimes(2);
  });

  test('aborts a request that is never answered and sends the next one', async () => {
    const get = vi
      .fn()
      .mockImplementationOnce(unanswered)
      .mockImplementationOnce(() => status(false));

    const watching = watchServerRestart(get);
    await vi.advanceTimersByTimeAsync(5000 + 200);

    await expect(watching).resolves.toBeUndefined();
    expect(get).toHaveBeenCalledTimes(2);
    expect(get.mock.calls[0][1].signal.aborted).toBe(true);
  });

  test('times out after 30 s even when no request is ever answered', async () => {
    const get = vi.fn(unanswered);

    const watching = watchServerRestart(get);
    const assertion = expect(watching).rejects.toThrow('timeout');
    await vi.advanceTimersByTimeAsync(40 * 1000);

    await assertion;
  });

  test('aborts the request in flight and sends no more once the caller aborts', async () => {
    const caller = new AbortController();
    const get = vi.fn(unanswered);

    const watching = watchServerRestart(get, { signal: caller.signal });
    const assertion = expect(watching).rejects.toThrow('timeout');
    await vi.advanceTimersByTimeAsync(0);
    caller.abort();
    await vi.advanceTimersByTimeAsync(40 * 1000);

    await assertion;
    expect(get).toHaveBeenCalledTimes(1);
    expect(get.mock.calls[0][1].signal.aborted).toBe(true);
  });
});
