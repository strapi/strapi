import type { Core } from '@strapi/types';

/**
 * `GET /api/end-users/permissions/me`: under the plugin's prefix, with the default config. Core
 * gives the route the scope `plugin::end-users.permissions.forCaller`, which the end-users strategy
 * allows for every caller without a grant (`ALWAYS_ALLOWED_SCOPES`).
 */
const routes: Core.RouterInput['routes'] = [
  { method: 'GET', path: '/permissions/me', handler: 'permissions.forCaller' },
];

export default routes;
