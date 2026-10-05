import type { Core } from '@strapi/types';

// No provider is loaded, so no middleware is registered.
declare const noMiddlewares: [keyof Strapi.Registries.PackageMiddlewares] extends [never]
  ? true
  : false;
noMiddlewares satisfies true;

declare const inline: Core.MiddlewareHandler;

// With the switch on, an empty middleware inventory accepts no name, only handlers and `resolve`.
({ middlewares: [inline, { resolve: './src/middlewares/custom' }] }) satisfies Core.RouteConfigFor;
({
  // @ts-expect-error Unregistered middlewares are rejected even without any registered middleware.
  middlewares: ['global::unregistered'],
}) satisfies Core.RouteConfigFor;
