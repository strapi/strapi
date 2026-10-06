/**
 * Lowest `Error.stackTraceLimit` used for the one capture below. Node keeps 10 frames by default,
 * which ends inside the document service middleware chain.
 */
const CALLER_STACK_LIMIT = 50;

/**
 * knex starts a transaction through a promise chain that V8's async stack traces cannot follow, so
 * an error raised while the transaction waits for its connection carries knex frames only. Append
 * the frames of the code awaiting us, captured here, so the stack reaches the caller. The error
 * object itself (class, name, message) is unchanged.
 */
export const appendCallerStack = (error: unknown): void => {
  if (!(error instanceof Error) || typeof error.stack !== 'string' || Error.stackTraceLimit === 0) {
    return;
  }

  const previousLimit = Error.stackTraceLimit;
  Error.stackTraceLimit = Math.max(previousLimit, CALLER_STACK_LIMIT);

  let callerStack: string | undefined;
  try {
    callerStack = new Error().stack;
  } finally {
    Error.stackTraceLimit = previousLimit;
  }

  // Drop the "Error" line and this function's own frame
  const frames = callerStack?.split('\n').slice(2) ?? [];
  if (frames.length > 0) {
    error.stack = `${error.stack}\n${frames.join('\n')}`;
  }
};
