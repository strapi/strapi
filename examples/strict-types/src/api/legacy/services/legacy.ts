/**
 * No contract export: type generation registers the type this factory returns, and marks the UID as
 * inferred. `Core.ServiceFactory<'api::legacy.legacy'>` rejects it (TS2344): that check would read
 * the type it defines. Export a `ServiceContract` to check the factory.
 */
export default () => ({
  ping: () => 'pong' as const,
});
