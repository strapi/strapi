import type { Core } from '@strapi/types';
import type { Controllers } from '../types/controllers';

// The published type stays the widened one develop infers; `satisfies` checks the literals.
const releaseActionRouter: {
  type: string;
  routes: {
    method: string;
    path: string;
    handler: string;
    config: {
      policies: (string | { name: string; config: { actions: string[] } })[];
    };
  }[];
} = {
  type: 'admin',
  routes: [
    {
      method: 'POST',
      path: '/:releaseId/actions',
      handler: 'release-action.create',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['plugin::content-releases.create-action'],
            },
          },
        ],
      },
    },
    {
      method: 'POST',
      path: '/:releaseId/actions/bulk',
      handler: 'release-action.createMany',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['plugin::content-releases.create-action'],
            },
          },
        ],
      },
    },
    {
      method: 'GET',
      path: '/:releaseId/actions',
      handler: 'release-action.findMany',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['plugin::content-releases.read'],
            },
          },
        ],
      },
    },
    {
      method: 'PUT',
      path: '/:releaseId/actions/:actionId',
      handler: 'release-action.update',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['plugin::content-releases.update'],
            },
          },
        ],
      },
    },
    {
      method: 'DELETE',
      path: '/:releaseId/actions/:actionId',
      handler: 'release-action.delete',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['plugin::content-releases.delete-action'],
            },
          },
        ],
      },
    },
  ],
} satisfies Core.RouterInputFor<Controllers, 'plugin::content-releases'>;

export default releaseActionRouter;
