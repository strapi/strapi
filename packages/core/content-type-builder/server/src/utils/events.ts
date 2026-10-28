import { inspect } from 'node:util';

/**
 * How long the request waits for the listeners of one schema event. A listener that
 * never settles (e.g. a `fetch` with no timeout) must not keep the save, and the
 * reload that follows it, waiting forever.
 */
const SCHEMA_EVENT_TIMEOUT_MS = 2500;

const TIMED_OUT = Symbol('timed out');

/**
 * `String()` throws on some values, e.g. an object without a prototype.
 */
const formatError = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  try {
    return String(error);
  } catch {
    return inspect(error);
  }
};

/**
 * Emits a content-type or component event once its schema change is written.
 *
 * The change is already on disk, so a failing listener must not fail the request
 * nor, as an unhandled rejection, crash the server: it is logged instead.
 * A listener still running after `SCHEMA_EVENT_TIMEOUT_MS` is left running and the
 * request moves on.
 */
export const emitSchemaEvent = async (eventName: string, payload: Record<string, unknown>) => {
  let timeout: NodeJS.Timeout | undefined;

  const emit = Promise.resolve()
    .then(() => strapi.eventHub.emit(eventName, payload))
    .catch((error: unknown) => {
      strapi.log.error(`A ${eventName} listener failed: ${formatError(error)}`);
    });

  const timedOut = new Promise<typeof TIMED_OUT>((resolve) => {
    timeout = setTimeout(resolve, SCHEMA_EVENT_TIMEOUT_MS, TIMED_OUT);
  });

  try {
    const result = await Promise.race([emit, timedOut]);

    if (result === TIMED_OUT) {
      strapi.log.warn(
        `The ${eventName} listeners did not finish within ${SCHEMA_EVENT_TIMEOUT_MS}ms, continuing without them`
      );
    }
  } finally {
    clearTimeout(timeout);
  }
};
