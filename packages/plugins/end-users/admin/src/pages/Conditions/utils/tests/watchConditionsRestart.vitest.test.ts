import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { isRestartTimeout, watchConditionsRestart } from '../watchConditionsRestart';

const status = (isUpdating: boolean) => Promise.resolve({ data: { data: { isUpdating } } });

/** A request the server accepts and never answers: it only settles when it is aborted. */
const unanswered = (_url: string, { signal }: { signal: AbortSignal }) =>
  new Promise<never>((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('aborted')));
  });

describe('watchConditionsRestart', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('asks the conditions status every 200 ms until the server is no longer updating', async () => {
    const get = vi
      .fn()
      .mockImplementationOnce(() => status(true))
      .mockImplementationOnce(() => status(true))
      .mockImplementationOnce(() => status(false));

    const watching = watchConditionsRestart(get);

    await vi.advanceTimersByTimeAsync(0);
    expect(get).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(199);
    expect(get).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(get).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(200);

    await expect(watching).resolves.toBeUndefined();
    expect(get).toHaveBeenCalledTimes(3);
    expect(get.mock.calls[0][0]).toBe('/end-users/conditions/status');
  });

  it('counts a failed request as still updating: the server is going down or coming up', async () => {
    const get = vi
      .fn()
      .mockImplementationOnce(() => Promise.reject(new Error('Network error')))
      .mockImplementationOnce(() => status(false));

    const watching = watchConditionsRestart(get);
    await vi.advanceTimersByTimeAsync(200);

    await expect(watching).resolves.toBeUndefined();
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('aborts a request that is never answered after 5 s and sends the next one', async () => {
    const get = vi
      .fn()
      .mockImplementationOnce(unanswered)
      .mockImplementationOnce(() => status(false));

    const watching = watchConditionsRestart(get);
    await vi.advanceTimersByTimeAsync(5000 + 200);

    await expect(watching).resolves.toBeUndefined();
    expect(get).toHaveBeenCalledTimes(2);
    expect(get.mock.calls[0][1].signal.aborted).toBe(true);
  });

  it('times out after 30 s even when no request is ever answered', async () => {
    const get = vi.fn(unanswered);

    const watching = watchConditionsRestart(get);
    const assertion = expect(watching).rejects.toSatisfy(isRestartTimeout);
    await vi.advanceTimersByTimeAsync(40 * 1000);

    await assertion;
  });

  it('aborts the request in flight and sends no more once the caller aborts', async () => {
    const caller = new AbortController();
    const get = vi.fn(unanswered);

    const watching = watchConditionsRestart(get, { signal: caller.signal });
    const assertion = expect(watching).rejects.toThrow('timeout');
    await vi.advanceTimersByTimeAsync(0);
    caller.abort();
    await vi.advanceTimersByTimeAsync(40 * 1000);

    await assertion;
    expect(get).toHaveBeenCalledTimes(1);
    expect(get.mock.calls[0][1].signal.aborted).toBe(true);
  });
});

describe('isRestartTimeout', () => {
  it('knows the error of a restart that took too long, and no other', () => {
    expect(isRestartTimeout(new Error('timeout'))).toBe(true);
    expect(isRestartTimeout(new Error('Network error'))).toBe(false);
    expect(isRestartTimeout('timeout')).toBe(false);
  });
});
