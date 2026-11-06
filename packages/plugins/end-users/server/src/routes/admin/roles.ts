import type { Core } from '@strapi/types';

import { ROLE_ACTIONS } from '../../admin-actions';
import { guard } from './guard';

/**
 * Roles, under `/end-users/roles`. `:documentId`, never the database id;
 * `PUT` to update, never `PATCH`. `/roles/import` and `/roles/:documentId` do not clash: the first is
 * a `POST`, the second has no `POST`.
 */
const routes: Core.RouterInput = {
  type: 'admin',
  routes: [
    { method: 'GET', path: '/roles', handler: 'role.find', config: guard(ROLE_ACTIONS.read) },
    { method: 'POST', path: '/roles', handler: 'role.create', config: guard(ROLE_ACTIONS.create) },
    {
      method: 'POST',
      path: '/roles/import',
      handler: 'role.import',
      config: guard(ROLE_ACTIONS.create),
    },
    {
      method: 'GET',
      path: '/roles/:documentId',
      handler: 'role.findOne',
      config: guard(ROLE_ACTIONS.read),
    },
    {
      method: 'PUT',
      path: '/roles/:documentId',
      handler: 'role.update',
      config: guard(ROLE_ACTIONS.update),
    },
    {
      method: 'DELETE',
      path: '/roles/:documentId',
      handler: 'role.delete',
      config: guard(ROLE_ACTIONS.delete),
    },
    {
      method: 'GET',
      path: '/roles/:documentId/export',
      handler: 'role.export',
      config: guard(ROLE_ACTIONS.read),
    },
  ],
};

export default routes;
