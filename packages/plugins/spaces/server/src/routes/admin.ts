export default {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/mine',
      handler: 'space.listMine',
      config: {
        // Every authenticated admin can list spaces — the switcher, the CTB
        // visibility multi-select and the move picker all need the list.
        // Per-role space filtering is a follow-up slice (see controllers/space.ts).
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'GET',
      path: '/mine/current',
      handler: 'space.getCurrent',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'PUT',
      path: '/mine/current',
      handler: 'space.setCurrent',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'GET',
      path: '/limits',
      handler: 'space.limits',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'GET',
      path: '/all',
      handler: 'space.listAll',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'PUT',
      path: '/:id',
      handler: 'space.update',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: { actions: ['plugin::spaces.update'] },
          },
        ],
      },
    },
    {
      method: 'DELETE',
      path: '/:id',
      handler: 'space.delete',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: { actions: ['plugin::spaces.delete'] },
          },
        ],
      },
    },
    {
      method: 'POST',
      path: '/',
      handler: 'space.create',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: { actions: ['plugin::spaces.create'] },
          },
        ],
      },
    },
    {
      method: 'GET',
      path: '/entry-states',
      handler: 'entry-state.list',
      config: {
        // Per-document read permission is checked in the controller.
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'GET',
      path: '/inheritance',
      handler: 'inheritance.summary',
      config: {
        // Per-content-type read permission is checked in the controller.
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'POST',
      path: '/inheritance/override',
      handler: 'inheritance.override',
      config: {
        // The Content Manager's update permission is checked in the controller:
        // an override is this workspace's own content from the moment it exists.
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'POST',
      path: '/inheritance/reset',
      handler: 'inheritance.reset',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'GET',
      path: '/releases/:id/status',
      handler: 'release-status.get',
      config: {
        // The releases read permission is checked in the controller.
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'POST',
      path: '/move',
      handler: 'move.moveToSpace',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: { actions: ['plugin::spaces.move-entry'] },
          },
        ],
      },
    },
  ],
};
