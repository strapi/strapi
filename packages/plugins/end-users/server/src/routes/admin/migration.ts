import type { Core } from '@strapi/types';

import { SETTINGS_ACTIONS } from '../../admin-actions';
import { guard } from './guard';

/**
 * The migration's status, acknowledging one of its report items, the check (in check mode), and the
 * project files it plans and, in development, writes. `GET` and `PUT`, never `PATCH`. These are the
 * only routes the plugin keeps in check mode.
 */
const routes: Core.RouterInput = {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/migration',
      handler: 'migration.status',
      config: guard(SETTINGS_ACTIONS.read),
    },
    {
      method: 'PUT',
      path: '/migration/items/:id',
      handler: 'migration.updateItem',
      config: guard(SETTINGS_ACTIONS.update),
    },
    {
      method: 'POST',
      path: '/migration/check',
      handler: 'migration.check',
      config: guard(SETTINGS_ACTIONS.update),
    },
    {
      method: 'GET',
      path: '/migration/files',
      handler: 'migration.files',
      config: guard(SETTINGS_ACTIONS.read),
    },
    {
      method: 'POST',
      path: '/migration/files',
      handler: 'migration.writeFiles',
      config: guard(SETTINGS_ACTIONS.update),
    },
  ],
};

export default routes;
