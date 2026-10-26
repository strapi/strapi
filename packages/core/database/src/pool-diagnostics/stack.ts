/** Lowest `Error.stackTraceLimit` used for the one re-capture below. Node's default is 10. */
const DEEP_STACK_LIMIT = 50;

/**
 * knex creates the timeout error with Node's default of 10 frames, which on the query path ends
 * inside the document service or a lifecycle hook. The caller of this function is awaited by the
 * same async chain, so capture that chain again with a higher limit (only on this failure path) and
 * keep knex's header and first frame. The error object itself is unchanged.
 *
 * A deeper stack is a convenience and must never replace the error being reported, so this leaves
 * the stack alone when stacks are disabled or when another library (APM, source maps) installed a
 * `prepareStackTrace` that returns something other than a string.
 */
export const deepenStack = (error: Error): void => {
  if (typeof error.stack !== 'string' || !(Error.stackTraceLimit > 0)) {
    return;
  }

  try {
    const previousLimit = Error.stackTraceLimit;
    Error.stackTraceLimit = Math.max(previousLimit, DEEP_STACK_LIMIT);

    let capture: unknown;
    try {
      capture = new Error().stack;
    } finally {
      Error.stackTraceLimit = previousLimit;
    }

    if (typeof capture !== 'string') {
      return;
    }

    const lines = error.stack.split('\n');
    const firstFrame = lines.findIndex((line) => line.trimStart().startsWith('at '));
    if (firstFrame === -1) {
      return;
    }

    // Header plus the frame where knex created the error, then the re-captured chain without its
    // "Error" line and this function's own frame
    error.stack = [...lines.slice(0, firstFrame + 1), ...capture.split('\n').slice(2)].join('\n');
  } catch {
    // Keep knex's stack: a deeper stack is a convenience and must never replace the error
  }
};
