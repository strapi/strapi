/**
 * Emits a content-type or component event once its schema change is written.
 *
 * The change is already on disk, so a failing listener must not fail the request
 * nor, as an unhandled rejection, crash the server: it is logged instead.
 */
export const emitSchemaEvent = async (eventName: string, payload: Record<string, unknown>) => {
  try {
    await strapi.eventHub.emit(eventName, payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    strapi.log.error(`A ${eventName} listener failed: ${message}`);
  }
};
