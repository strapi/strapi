export default {
  type: 'admin',
  routes: [
    {
      method: 'POST',
      path: '/',
      handler: 'email.send',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'POST',
      path: '/test',
      handler: 'email.test',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          { name: 'admin::hasPermissions', config: { actions: ['plugin::email.settings.read'] } },
        ],
      },
    },
    {
      method: 'GET',
      path: '/settings',
      handler: 'email.getSettings',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          { name: 'admin::hasPermissions', config: { actions: ['plugin::email.settings.read'] } },
        ],
      },
    },
    {
      method: 'POST',
      path: '/verify',
      handler: 'email.verify',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          { name: 'admin::hasPermissions', config: { actions: ['plugin::email.settings.read'] } },
        ],
      },
    },
    {
      method: 'GET',
      path: '/templates',
      handler: 'template.list',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          { name: 'admin::hasPermissions', config: { actions: ['plugin::email.templates.read'] } },
        ],
      },
    },
    {
      method: 'GET',
      path: '/templates/:key',
      handler: 'template.get',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          { name: 'admin::hasPermissions', config: { actions: ['plugin::email.templates.read'] } },
        ],
      },
    },
    {
      method: 'PUT',
      path: '/templates/:key',
      handler: 'template.update',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: { actions: ['plugin::email.templates.update'] },
          },
        ],
      },
    },
    {
      method: 'DELETE',
      path: '/templates/:key',
      handler: 'template.reset',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: { actions: ['plugin::email.templates.update'] },
          },
        ],
      },
    },
    {
      method: 'POST',
      path: '/templates/:key/test',
      handler: 'template.test',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: { actions: ['plugin::email.templates.update'] },
          },
        ],
      },
    },
  ],
};
