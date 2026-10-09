import { performance } from 'node:perf_hooks';

export interface ThrottleOptions {
  /** Minimum time between two emissions. */
  intervalMs: number;
  /**
   * Clock in milliseconds, injectable for tests. Defaults to performance.now(), which is monotonic:
   * a wall clock stepping backwards (NTP, VM resume) would hold the throttle shut for the size of
   * the step plus the interval.
   */
  now?: () => number;
}

export interface ThrottleDecision {
  /** True when the caller should log now. */
  emit: boolean;
  /** Calls not emitted since the previous emission (reported with the next one). */
  suppressed: number;
}

export interface Throttle {
  take(): ThrottleDecision;
}

/**
 * Lets the first call through, then at most one per interval, and counts what it held back.
 * Sibling of createHeartbeatLogger (migrations/heartbeat.ts), which only emits once a full interval
 * has passed and so would drop the first warning of an incident.
 */
export const createThrottle = ({
  intervalMs,
  now = () => performance.now(),
}: ThrottleOptions): Throttle => {
  let lastEmittedAt: number | undefined;
  let suppressed = 0;

  return {
    take() {
      const current = now();

      if (lastEmittedAt !== undefined && current - lastEmittedAt < intervalMs) {
        suppressed += 1;
        return { emit: false, suppressed };
      }

      const held = suppressed;
      suppressed = 0;
      lastEmittedAt = current;
      return { emit: true, suppressed: held };
    },
  };
};
