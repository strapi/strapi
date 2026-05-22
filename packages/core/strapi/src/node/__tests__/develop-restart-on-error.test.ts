import {
  computeWorkerRestartDelay,
  DEFAULT_BACKOFF_THRESHOLD,
  DEFAULT_MAX_RESTART_BACKOFF_MS,
  DEFAULT_UNEXPECTED_EXIT_WINDOW_MS,
} from '../develop-restart-on-error';

describe('computeWorkerRestartDelay', () => {
  const now = 100_000;

  it('returns no delay for the first unexpected exit', () => {
    const result = computeWorkerRestartDelay([], now);

    expect(result.delayMs).toBe(0);
    expect(result.timestamps).toEqual([now]);
  });

  it('returns no delay until the backoff threshold is reached', () => {
    const firstExit = now - 1_000;

    const result = computeWorkerRestartDelay([firstExit], now, {
      threshold: DEFAULT_BACKOFF_THRESHOLD,
    });

    expect(result.delayMs).toBe(0);
    expect(result.timestamps).toEqual([firstExit, now]);
  });

  it('applies linear backoff once the threshold is reached', () => {
    const timestamps = [now - 2_000, now - 1_000];

    const result = computeWorkerRestartDelay(timestamps, now, {
      threshold: DEFAULT_BACKOFF_THRESHOLD,
    });

    expect(result.delayMs).toBe(1_000);
  });

  it('caps backoff at the configured maximum', () => {
    const timestamps = Array.from({ length: 10 }, (_, index) => now - index * 500);

    const result = computeWorkerRestartDelay(timestamps, now, {
      threshold: DEFAULT_BACKOFF_THRESHOLD,
      maxBackoffMs: DEFAULT_MAX_RESTART_BACKOFF_MS,
    });

    expect(result.delayMs).toBe(DEFAULT_MAX_RESTART_BACKOFF_MS);
  });

  it('drops crash timestamps outside the sliding window', () => {
    const staleExit = now - DEFAULT_UNEXPECTED_EXIT_WINDOW_MS - 1;
    const recentExit = now - 1_000;

    const result = computeWorkerRestartDelay([staleExit, recentExit], now);

    expect(result.timestamps).toEqual([recentExit, now]);
    expect(result.delayMs).toBe(0);
  });
});
