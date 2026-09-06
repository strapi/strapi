/**
 * Coalesces high-frequency values into at most one flush per animation frame.
 *
 * `XHR.upload.onprogress` can fire many times per second on a fast connection.
 * Dispatching each one to Redux would flood the store, so the orchestrator routes
 * progress through a batcher: many `schedule(value)` calls within a single frame
 * collapse into one `flush(latestValue)` callback.
 *
 * @param flush - Invoked once per frame with the most recent scheduled value.
 */
export const createRafBatcher = <T>(flush: (value: T) => void) => {
  let frame: number | null = null;
  let latest: T;

  const run = () => {
    frame = null;
    flush(latest);
  };

  return {
    /**
     * Records the latest value and ensures a flush is scheduled for the next frame.
     * Repeated calls within the same frame overwrite the value without scheduling
     * additional frames.
     */
    schedule(value: T) {
      latest = value;
      if (frame === null) {
        frame = requestAnimationFrame(run);
      }
    },
    /**
     * Cancels any pending flush so a value scheduled this frame will not fire.
     */
    cancel() {
      if (frame !== null) {
        cancelAnimationFrame(frame);
        frame = null;
      }
    },
  };
};

export type RafBatcher<T> = ReturnType<typeof createRafBatcher<T>>;
