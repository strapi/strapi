export interface EventLoopDelay {
  /** Longest delay seen in the window, in ms, sampling interval removed. */
  maxMs: number;
  p99Ms: number;
  /** Length of the window the values cover. */
  windowMs: number;
}
