import type { Core } from '@strapi/types';
import type { Controllers } from '../types/controllers';

// The published type stays the one develop infers; `satisfies` checks the literals.
const routes: {
  method: string;
  path: string;
  handler: string;
  config: {
    policies: (string | { name: string; config: { actions: string[] } })[];
  };
}[] = [
  {
    method: 'POST',
    path: '/api-tokens',
    handler: 'api-token.create',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::api-tokens.create'] } },
      ],
    },
  },
  {
    method: 'GET',
    path: '/api-tokens',
    handler: 'api-token.list',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::api-tokens.read'] } },
      ],
    },
  },
  {
    method: 'DELETE',
    path: '/api-tokens/:id',
    handler: 'api-token.revoke',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::api-tokens.delete'] } },
      ],
    },
  },
  {
    method: 'GET',
    path: '/api-tokens/:id',
    handler: 'api-token.get',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::api-tokens.read'] } },
      ],
    },
  },
  {
    method: 'PUT',
    path: '/api-tokens/:id',
    handler: 'api-token.update',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::api-tokens.update'] } },
      ],
    },
  },
  {
    method: 'POST',
    path: '/api-tokens/:id/regenerate',
    handler: 'api-token.regenerate',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::api-tokens.regenerate'] } },
      ],
    },
  },
] satisfies Core.RouteInputFor<Controllers>[];

export default routes;
