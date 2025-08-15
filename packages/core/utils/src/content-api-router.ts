/**
 * Creates a content-api route factory that exposes `routes` on the factory function for backward compatibility.
 *
 * This allows legacy extensions to mutate `plugin.routes["content-api"].routes` directly.
 */
export const createContentApiRoutesFactory = <TRoutes>(buildRoutes: () => TRoutes) => {
  let sharedRoutes: TRoutes | undefined;

  const ensureSharedRoutes = (): TRoutes => {
    if (!sharedRoutes) {
      sharedRoutes = buildRoutes();
    }

    return sharedRoutes;
  };

  const createContentApiRoutes = () => {
    return {
      type: 'content-api' as const,
      routes: ensureSharedRoutes(),
    };
  };

  Object.defineProperty(createContentApiRoutes, 'routes', {
    get: ensureSharedRoutes,
    set(next: TRoutes) {
      sharedRoutes = next;
    },
    enumerable: true,
  });

  return createContentApiRoutes;
};

export type ContentApiRoutesFactory<TRoutes> = ReturnType<
  typeof createContentApiRoutesFactory<TRoutes>
> & { routes: TRoutes };
