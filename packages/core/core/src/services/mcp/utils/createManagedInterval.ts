export type ManagedInterval = {
  start: (callback: () => void, intervalMs: number) => void;
  clear: () => void;
};

/**
 * Creates a managed interval that automatically clears any existing interval before starting a new one
 */
export const createManagedInterval = (): ManagedInterval => {
  let intervalId: NodeJS.Timeout | undefined;

  return {
    /**
     * Starts the interval, clearing any existing interval first
     */
    start(callback, intervalMs) {
      if (intervalId !== undefined) {
        clearInterval(intervalId);
      }
      intervalId = setInterval(callback, intervalMs);
    },

    /**
     * Clears the current interval if one exists
     */
    clear() {
      if (intervalId !== undefined) {
        clearInterval(intervalId);
        intervalId = undefined;
      }
    },
  };
};
