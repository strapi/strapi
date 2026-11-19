import type { Core } from '@strapi/types';
import type { Controllers } from '../types/controllers';

// The published type stays the one develop infers; `satisfies` checks the literals.
const routes: {
  method: string;
  path: string;
  handler: string;
  config: {
    policies: (
      | string
      | {
          name: string;
          config: {
            actions: string[];
          };
        }
    )[];
  };
}[] = [
  {
    method: 'GET',
    path: '/roles/:id/permissions',
    handler: 'role.getPermissions',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::roles.read'] } },
      ],
    },
  },
  {
    method: 'PUT',
    path: '/roles/:id/permissions',
    handler: 'role.updatePermissions',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::roles.update'] } },
      ],
    },
  },
  {
    method: 'GET',
    path: '/roles/:id',
    handler: 'role.findOne',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::roles.read'] } },
      ],
    },
  },
  {
    method: 'GET',
    path: '/roles',
    handler: 'role.findAll',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::roles.read'] } },
      ],
    },
  },
  {
    method: 'POST',
    path: '/roles',
    handler: 'role.create',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        {
          name: 'admin::hasPermissions',
          config: {
            actions: ['admin::roles.create'],
          },
        },
      ],
    },
  },
  {
    method: 'PUT',
    path: '/roles/:id',
    handler: 'role.update',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::roles.update'] } },
      ],
    },
  },
  {
    method: 'DELETE',
    path: '/roles/:id',
    handler: 'role.deleteOne',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        {
          name: 'admin::hasPermissions',
          config: {
            actions: ['admin::roles.delete'],
          },
        },
      ],
    },
  },
  {
    method: 'POST',
    path: '/roles/batch-delete',
    handler: 'role.deleteMany',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        {
          name: 'admin::hasPermissions',
          config: {
            actions: ['admin::roles.delete'],
          },
        },
      ],
    },
  },
] satisfies Core.RouteInputFor<Controllers>[];

export default routes;
