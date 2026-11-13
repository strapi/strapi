import type { Core } from '@strapi/types';

import { readCompatConfig } from '../../compat/config';

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

/**
 * `DELETE /auth/sessions/:sessionId` (the refresh routes' way to sign one session out), which the
 * catch-all does not carry. Only while the Users & Permissions compatibility mode is on, so the
 * route table is the one above without it. Made when the routes are read, which is when the server
 * registers them.
 */
export const compatAuthRoutes = (): Core.RouterInput['routes'] =>
  readCompatConfig(strapi).usersPermissions
    ? [{ method: 'DELETE', path: '/auth/sessions/:sessionId', handler: 'auth.handle', config }]
    : [];
