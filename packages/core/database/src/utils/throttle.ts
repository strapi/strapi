export interface ThrottleOptions {
  /** Minimum time between two emissions. */
  intervalMs: number;
  /** Injectable clock for tests. */
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
  now = () => Date.now(),
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
