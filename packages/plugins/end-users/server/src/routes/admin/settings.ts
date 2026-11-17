import type { Core } from '@strapi/types';

import { SETTINGS_ACTIONS } from '../../admin-actions';
import { guard } from './guard';

/** The settings document, under `/end-users/settings`: one `GET`, one `PUT`, never `PATCH`. */
const routes: Core.RouterInput = {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/settings',
      handler: 'settings.find',
      config: guard(SETTINGS_ACTIONS.read),
    },
    {
      method: 'PUT',
      path: '/settings',
      handler: 'settings.update',
      config: guard(SETTINGS_ACTIONS.update),
    },
  ],
};

export default routes;
