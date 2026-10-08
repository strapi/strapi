import { monitorEventLoopDelay, type IntervalHistogram } from 'node:perf_hooks';

/** Sampling interval of the event loop delay histogram. */
export const EVENT_LOOP_RESOLUTION_MS = 20;

/** Every rotation drops the older half, so a report covers the last 30 to 60 s. */
export const EVENT_LOOP_ROTATION_MS = 30_000;

export interface EventLoopDelay {
  /** Longest delay seen in the window, in ms, sampling interval removed. */
  maxMs: number;
  p99Ms: number;
  /** Length of the window the values cover. */
  windowMs: number;
}

export interface EventLoopMonitor {
  read(): EventLoopDelay | undefined;
  stop(): void;
}

export interface EventLoopMonitorOptions {
  /** Injectable clock for tests. */
  now?: () => number;
  /** How often the older histogram is cleared and reused. */
  rotateEveryMs?: number;
}

/** The histogram records the time between samples, so an idle loop reads one sampling interval. */
export const toDelayMs = (nanoseconds: number): number =>
  Math.max(0, Math.round(nanoseconds / 1e6 - EVENT_LOOP_RESOLUTION_MS));

const startHistogram = (): IntervalHistogram => {
  const histogram = monitorEventLoopDelay({ resolution: EVENT_LOOP_RESOLUTION_MS });
  histogram.enable();
  return histogram;
};

/**
 * A starved process fires timers late, so an acquire can time out even though the database
 * answered. Two histograms take turns so a report covers the last one to two rotation periods,
 * not everything since the process started. Neither the histograms nor the rotation timer keep
 * the process alive.
 */
export const createEventLoopMonitor = ({
  now = () => Date.now(),
  rotateEveryMs = EVENT_LOOP_ROTATION_MS,
}: EventLoopMonitorOptions = {}): EventLoopMonitor => {
  let older = startHistogram();
  let newer = startHistogram();
  let olderStartedAt = now();
  let newerStartedAt = olderStartedAt;

  const rotate = () => {
    older.reset();
    [older, newer] = [newer, older];
    olderStartedAt = newerStartedAt;
    newerStartedAt = now();
  };

  const timer = setInterval(rotate, rotateEveryMs);
  timer.unref();

  return {
    read() {
      if (older.count === 0) {
        return undefined;
      }

      return {
        maxMs: toDelayMs(older.max),
        p99Ms: toDelayMs(older.percentile(99)),
        windowMs: now() - olderStartedAt,
      };
    },

    stop() {
      clearInterval(timer);
      older.disable();
      newer.disable();
    },
  };
};
