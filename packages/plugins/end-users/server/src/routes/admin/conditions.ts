import type { Core } from '@strapi/types';

import { CONDITION_ACTIONS } from '../../admin-actions';
import { PLUGIN_ID } from '../../constants';
import { guard } from './guard';

/**
 * The builder's writes: the admin must be signed in and hold `conditions.update`, and only then does
 * Strapi have to be running in development (`plugin::end-users.is-development`), so that only an
 * authorized admin learns the environment.
 */
const writeGuard = (): Core.RouteConfig => ({
  policies: [
    ...(guard(CONDITION_ACTIONS.update).policies as string[]),
    `plugin::${PLUGIN_ID}.is-development`,
  ],
});

/**
 * Conditions, under `/end-users/conditions`. The list, the builder's layout, the preview and the
 * status are for an admin who may read conditions, in any environment; the builder's writes are
 * `PUT` to update, never `PATCH`, name the condition by its slug, and are for development only.
 * `GET /conditions/status` has no `:slug` route to clash with: the slug routes are `PUT` and `DELETE`.
 */
const routes: Core.RouterInput = {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/conditions',
      handler: 'condition.find',
      config: guard(CONDITION_ACTIONS.read),
    },
    {
      method: 'GET',
      path: '/conditions/status',
      handler: 'condition.status',
      config: guard(CONDITION_ACTIONS.read),
    },
    {
      method: 'GET',
      path: '/conditions/builder-layout',
      handler: 'condition.builderLayout',
      config: guard(CONDITION_ACTIONS.read),
    },
    {
      method: 'POST',
      path: '/conditions/preview',
      handler: 'condition.preview',
      config: guard(CONDITION_ACTIONS.read),
    },
    {
      method: 'POST',
      path: '/conditions',
      handler: 'condition.create',
      config: writeGuard(),
    },
    {
      method: 'PUT',
      path: '/conditions/:slug',
      handler: 'condition.update',
      config: writeGuard(),
    },
    {
      method: 'DELETE',
      path: '/conditions/:slug',
      handler: 'condition.delete',
      config: writeGuard(),
    },
  ],
};

export default routes;
