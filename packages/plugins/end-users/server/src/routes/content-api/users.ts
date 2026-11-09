import { factories } from '@strapi/strapi';
import type { Core, UID } from '@strapi/types';

import { readCompatConfig } from '../../compat/config';
import { PROFILE_UID, USER_UID } from '../../constants';

/**
 * `prefix: ''` puts a route at `/api/<path>` instead of under the plugin name. A route that sets it
 * is mounted on the Content API router itself, in the order the routes are listed.
 */
const config: Core.RouteConfig = { prefix: '' };

/**
 * The caller's own user and profile. The scope of each route, which a role has to be granted, is
 * `plugin::end-users.me.<action>`; Authenticated is given the three when it is created (bootstrap).
 *
 * They come before the core routes because `/users/me` is also what `/users/:id` matches: the first
 * route that matches answers.
 */
export const meRoutes: Core.RouterInput['routes'] = [
  { method: 'GET', path: '/users/me', handler: 'me.find', config },
  { method: 'GET', path: '/users/me/profile', handler: 'me.findProfile', config },
  { method: 'PUT', path: '/users/me/profile', handler: 'me.updateProfile', config },
];

/**
 * Strapi's core routes of a content type (`find`, `findOne`, `create`, `update`, `delete`) at
 * `/api/<plural name>`. Made when the routes are read, which is when the server registers them: the
 * core router reads the content type, and the content types are not final until then.
 */
const coreRoutes = (uid: UID.ContentType): Core.RouteInput[] =>
  (factories.createCoreRouter(uid).routes as Core.Route[]).map((route) => ({
    ...route,
    config: { ...route.config, ...config },
  }));

/**
 * `GET /api/users/count`, a bare number, while the Users & Permissions compatibility mode is on. A
 * role is granted it as `plugin::end-users.user.count`. Before `/users/:id`, which it would match.
 */
const compatRoutes = (): Core.RouterInput['routes'] =>
  readCompatConfig(strapi).usersPermissions
    ? [{ method: 'GET', path: '/users/count', handler: `${USER_UID}.count`, config: { ...config } }]
    : [];

/** `/api/users*` for the user type and `/api/profiles*` for the profile type. */
const usersRoutes = (): Core.RouterInput['routes'] => [
  ...meRoutes,
  ...compatRoutes(),
  ...coreRoutes(USER_UID),
  ...coreRoutes(PROFILE_UID),
];

export default usersRoutes;
