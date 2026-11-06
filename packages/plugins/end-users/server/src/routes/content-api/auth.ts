import type { Core } from '@strapi/types';

/**
 * The native Better Auth endpoints: every one of them is a GET or a POST, so these two routes carry
 * them all. `prefix: ''` puts them at `/api/auth/*` instead of under the plugin
 * name; `auth: false` because Better Auth reads the session itself, from the cookie or the Bearer
 * token; and the allow-list refuses the ones that must not be reachable.
 */
const config: Core.RouteConfig = {
  auth: false,
  prefix: '',
  middlewares: ['plugin::end-users.endpoint-allowlist'],
};

const routes: Core.RouterInput['routes'] = [
  { method: 'GET', path: '/auth/:path*', handler: 'auth.handle', config },
  { method: 'POST', path: '/auth/:path*', handler: 'auth.handle', config },
];

export default routes;
