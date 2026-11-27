import type { Core } from '@strapi/strapi';
// Generated `plugins.d.ts` loads the declarations of the JavaScript users-permissions plugin.
import type {} from '@strapi/plugin-users-permissions/strapi-server';

// The strict middleware inventory is closed: the plugin registers the middleware its auth routes
// name, so route configs that reuse it compile.
type Controllers = { auth: { callback: Core.ControllerHandler } };

({
  type: 'content-api',
  routes: [
    {
      method: 'GET',
      path: '/auth/:provider/callback',
      handler: 'auth.callback',
      config: {
        middlewares: [
          'plugin::users-permissions.rateLimit',
          { name: 'plugin::users-permissions.rateLimit', config: { interval: { min: 1 }, max: 3 } },
        ],
      },
    },
  ],
}) satisfies Core.RouterInputFor<Controllers>;

({
  // @ts-expect-error The plugin registers no other middleware.
  middlewares: ['plugin::users-permissions.nope'],
}) satisfies Core.RouteConfigFor;
({
  // @ts-expect-error Rate limit options are checked.
  middlewares: [{ name: 'plugin::users-permissions.rateLimit', config: { max: '3' } }],
}) satisfies Core.RouteConfigFor;
