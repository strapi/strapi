import { inspect } from 'node:util';

/** The content-type and component events the Content-Type Builder emits. */
type SchemaEventName =
  | 'content-type.create'
  | 'content-type.update'
  | 'content-type.delete'
  | 'component.create'
  | 'component.update'
  | 'component.delete';

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
export const emitSchemaEvent = async <TName extends SchemaEventName>(
  eventName: TName,
  payload: Strapi.Registries.Events[TName][0]
) => {
  let timeout: NodeJS.Timeout | undefined;

  const emit = Promise.resolve()
    // The parameters check the payload against the registered event. The hub cannot resolve the
    // registered arguments of a generic name, so it reads the name as a plain string.
    .then(() => strapi.eventHub.emit(eventName as string, payload))
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
