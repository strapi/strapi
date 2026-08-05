export const DEFAULT_DETAILED_WARNING_LIMIT = 10;

/**
 * Emits per-item warning messages up to `limit`, then a one-time suppression
 * notice. Callers should still emit an unconditional end-of-stage summary.
 */
export const createCappedWarningReporter = (
  onWarning?: (message: string) => void,
  limit: number = DEFAULT_DETAILED_WARNING_LIMIT
) => {
  let emitted = 0;

  return {
    warn(message: string) {
      if (!onWarning) {
        return;
      }

      if (emitted >= limit) {
        return;
      }

      onWarning(message);
      emitted += 1;

      if (emitted === limit) {
        onWarning(
          `Further detailed warnings suppressed after ${limit} messages. See the stage summary for totals.`
        );
      }
    },
  };
};
