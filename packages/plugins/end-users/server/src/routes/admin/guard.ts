import type { Core } from '@strapi/types';

import { PLUGIN_ID } from '../../constants';

/** The admin must be signed in, and hold the action: the second check is what an Author fails. */
export const guard = (action: string): Core.RouteConfig => ({
  policies: [
    'admin::isAuthenticatedAdmin',
    { name: 'admin::hasPermissions', config: { actions: [action] } },
  ],
});

/**
 * The admin must be signed in, and hold at least one of the actions (`guard` needs the one). For a
 * route that two admin pages use, each with an action of its own.
 */
export const guardAny = (actions: string[]): Core.RouteConfig => ({
  policies: [
    'admin::isAuthenticatedAdmin',
    { name: `plugin::${PLUGIN_ID}.has-any-admin-permission`, config: { actions } },
  ],
});
