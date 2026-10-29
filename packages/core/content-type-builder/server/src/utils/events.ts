/** The content-type and component events the Content-Type Builder emits. */
type SchemaEventName =
  | 'content-type.create'
  | 'content-type.update'
  | 'content-type.delete'
  | 'component.create'
  | 'component.update'
  | 'component.delete';

/**
 * Emits a content-type or component event once its schema change is written.
 *
 * The change is already on disk, so a failing listener must not fail the request
 * nor, as an unhandled rejection, crash the server: it is logged instead.
 */
export const emitSchemaEvent = async <TName extends SchemaEventName>(
  eventName: TName,
  payload: Strapi.Registries.Events[TName][0]
) => {
  try {
    // The parameters check the payload against the registered event. The hub cannot resolve the
    // registered arguments of a generic name, so it reads the name as a plain string.
    await strapi.eventHub.emit(eventName as string, payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    strapi.log.error(`A ${eventName} listener failed: ${message}`);
  }
};
