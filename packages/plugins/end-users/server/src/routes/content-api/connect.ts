import type { Core } from '@strapi/types';

import { readCompatConfig } from '../../compat/config';

/**
 * `prefix: ''` puts the routes at `/api/connect/*`; `auth: false` because the browser has no
 * session yet. The engine reads the sign-in state from its own cookies.
 */
const config: Core.RouteConfig = { auth: false, prefix: '' };

/**
 * The Users & Permissions OAuth routes, only while its compatibility mode is on: with it off there
 * is no `/api/connect`. Made when the routes are read, which is when the server registers them.
 */
const compatConnectRoutes = (): Core.RouterInput['routes'] =>
  readCompatConfig(strapi).usersPermissions
    ? [
        { method: 'GET', path: '/connect/:provider', handler: 'connect.start', config },
        { method: 'GET', path: '/connect/:provider/callback', handler: 'connect.callback', config },
      ]
    : [];

export default compatConnectRoutes;
