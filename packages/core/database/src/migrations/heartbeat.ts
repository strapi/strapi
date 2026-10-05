export interface HeartbeatLoggerOptions {
  /** Minimum time between heartbeat log lines. Defaults to 60s. */
  intervalMs?: number;
  /** Injectable clock for tests. */
  now?: () => number;
}

export interface HeartbeatLogger {
  /**
   * Emit `buildMessage(elapsedSeconds)` at most once per interval.
   * Safe to call on every batch — no-ops until the interval elapses.
   */
  tick(buildMessage: (elapsedSeconds: number) => string): void;
}

/**
 * Append-only, time-throttled progress logger for long-running migrations.
 * Never rewrites terminal lines — one complete Winston info line per tick.
 */
export const createHeartbeatLogger = (
  log: (message: string) => void,
  { intervalMs = 60_000, now = () => Date.now() }: HeartbeatLoggerOptions = {}
): HeartbeatLogger => {
  const startedAt = now();
  let lastEmittedAt = startedAt;

  return {
    tick(buildMessage) {
      const current = now();
      if (current - lastEmittedAt < intervalMs) {
        return;
      }

      const elapsedSeconds = Math.floor((current - startedAt) / 1000);
      log(buildMessage(elapsedSeconds));
      lastEmittedAt = current;
    },
  };
};
