import type { Core } from '@strapi/types';

import { CONDITION_ACTIONS, ROLE_ACTIONS } from '../../admin-actions';
import { guardAny } from './guard';

/**
 * The permission layout, under `/end-users/permissions`: what the role editor
 * is drawn from, and the routes bound to a content type or route group, for its details pane. Both
 * are for an admin who may read roles or read conditions: the role editor needs them,
 * and so does the condition builder.
 */
const routes: Core.RouterInput = {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/permissions/layout',
      handler: 'permission-layout.layout',
      config: guardAny([ROLE_ACTIONS.read, CONDITION_ACTIONS.read]),
    },
    {
      method: 'GET',
      path: '/permissions/routes',
      handler: 'permission-layout.routes',
      config: guardAny([ROLE_ACTIONS.read, CONDITION_ACTIONS.read]),
    },
  ],
};

export default routes;
