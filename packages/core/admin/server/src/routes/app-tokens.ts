export default [
  {
    method: 'GET',
    path: '/users/me/app-tokens',
    handler: 'app-token.list',
    config: {
      policies: ['admin::isAuthenticatedAdmin'],
    },
  },
  {
    method: 'POST',
    path: '/users/me/app-tokens',
    handler: 'app-token.create',
    config: {
      policies: ['admin::isAuthenticatedAdmin'],
    },
  },
  {
    method: 'GET',
    path: '/users/me/app-tokens/:id',
    handler: 'app-token.get',
    config: {
      policies: ['admin::isAuthenticatedAdmin', 'admin::isOwnerOfAppToken'],
    },
  },
  {
    method: 'PUT',
    path: '/users/me/app-tokens/:id',
    handler: 'app-token.update',
    config: {
      policies: ['admin::isAuthenticatedAdmin', 'admin::isOwnerOfAppToken'],
    },
  },
  {
    method: 'DELETE',
    path: '/users/me/app-tokens/:id',
    handler: 'app-token.revoke',
    config: {
      policies: ['admin::isAuthenticatedAdmin', 'admin::isOwnerOfAppToken'],
    },
  },
  {
    method: 'POST',
    path: '/users/me/app-tokens/:id/regenerate',
    handler: 'app-token.regenerate',
    config: {
      policies: ['admin::isAuthenticatedAdmin', 'admin::isOwnerOfAppToken'],
    },
  },
  {
    method: 'GET',
    path: '/users/me/app-tokens/:id/permissions',
    handler: 'app-token.getPermissions',
    config: {
      policies: ['admin::isAuthenticatedAdmin', 'admin::isOwnerOfAppToken'],
    },
  },
  {
    method: 'PUT',
    path: '/users/me/app-tokens/:id/permissions',
    handler: 'app-token.updatePermissions',
    config: {
      policies: ['admin::isAuthenticatedAdmin', 'admin::isOwnerOfAppToken'],
    },
  },
];
