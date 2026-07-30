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
