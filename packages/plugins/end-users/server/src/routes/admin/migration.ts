import type { Core } from '@strapi/types';

import { SETTINGS_ACTIONS } from '../../admin-actions';
import { guard } from './guard';

/** The migration's status, and acknowledging one of its report items: `GET` and `PUT`, never `PATCH`. */
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
  ],
};

export default routes;
