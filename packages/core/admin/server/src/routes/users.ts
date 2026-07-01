const authenticatedAdminRoute = (
  method: 'GET' | 'PUT' | 'DELETE' | 'POST',
  path: string,
  handler: string
) => ({
  method,
  path,
  handler,
  config: {
    policies: ['admin::isAuthenticatedAdmin'],
  },
});

export default [
  authenticatedAdminRoute('GET', '/users/me', 'authenticated-user.getMe'),
  authenticatedAdminRoute('PUT', '/users/me', 'authenticated-user.updateMe'),
  authenticatedAdminRoute('GET', '/users/me/permissions', 'authenticated-user.getOwnPermissions'),
  authenticatedAdminRoute('GET', '/users/me/sessions', 'authenticated-session.list'),
  authenticatedAdminRoute('DELETE', '/users/me/sessions', 'authenticated-session.revokeAll'),
  authenticatedAdminRoute(
    'DELETE',
    '/users/me/sessions/:sessionId',
    'authenticated-session.revoke'
  ),
  {
    method: 'POST',
    path: '/users',
    handler: 'user.create',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::users.create'] } },
      ],
    },
  },
  {
    method: 'GET',
    path: '/users',
    handler: 'user.find',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::users.read'] } },
      ],
    },
  },
  {
    method: 'GET',
    path: '/users/:id',
    handler: 'user.findOne',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::users.read'] } },
      ],
    },
  },
  {
    method: 'PUT',
    path: '/users/:id',
    handler: 'user.update',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::users.update'] } },
      ],
    },
  },
  {
    method: 'DELETE',
    path: '/users/:id',
    handler: 'user.deleteOne',
    config: {
      policies: [{ name: 'admin::hasPermissions', config: { actions: ['admin::users.delete'] } }],
    },
  },
  {
    method: 'POST',
    path: '/users/batch-delete',
    handler: 'user.deleteMany',
    config: {
      policies: [{ name: 'admin::hasPermissions', config: { actions: ['admin::users.delete'] } }],
    },
  },
];
