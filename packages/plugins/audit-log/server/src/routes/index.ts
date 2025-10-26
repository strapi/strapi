const adminRoutes = {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/',
      handler: 'audit-log.find',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'plugin::content-manager.hasPermissions',
            config: { actions: ['plugin::audit-log.read'] },
          },
        ],
      },
    },
  ],
};

console.log('[audit-log] Exporting admin routes:', JSON.stringify(adminRoutes, null, 2));

export default {
  admin: adminRoutes,
};
