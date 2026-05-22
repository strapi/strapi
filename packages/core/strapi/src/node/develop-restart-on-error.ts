const DEFAULT_UNEXPECTED_EXIT_WINDOW_MS = 10_000;
const DEFAULT_BACKOFF_THRESHOLD = 3;
const DEFAULT_MAX_RESTART_BACKOFF_MS = 5_000;

interface WorkerRestartBackoffOptions {
  windowMs?: number;
  threshold?: number;
  maxBackoffMs?: number;
}

/**
 * Prune crash timestamps outside the sliding window and compute restart delay.
 */
const computeWorkerRestartDelay = (
  unexpectedExitTimestamps: number[],
  now: number,
  options: WorkerRestartBackoffOptions = {}
): { timestamps: number[]; delayMs: number } => {
  const windowMs = options.windowMs ?? DEFAULT_UNEXPECTED_EXIT_WINDOW_MS;
  const threshold = options.threshold ?? DEFAULT_BACKOFF_THRESHOLD;
  const maxBackoffMs = options.maxBackoffMs ?? DEFAULT_MAX_RESTART_BACKOFF_MS;

  const timestamps = [...unexpectedExitTimestamps, now].filter(
    (timestamp) => now - timestamp <= windowMs
  );

  const crashCount = timestamps.length;
  const delayMs =
    crashCount >= threshold ? Math.min((crashCount - threshold + 1) * 1_000, maxBackoffMs) : 0;

  return { timestamps, delayMs };
};

export {
  computeWorkerRestartDelay,
  DEFAULT_BACKOFF_THRESHOLD,
  DEFAULT_MAX_RESTART_BACKOFF_MS,
  DEFAULT_UNEXPECTED_EXIT_WINDOW_MS,
};
export type { WorkerRestartBackoffOptions };
