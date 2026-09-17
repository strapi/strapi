const withPermission = (action: string) => ({
  policies: [
    'admin::isAuthenticatedAdmin',
    { name: 'admin::hasPermissions', config: { actions: [`plugin::channels.${action}`] } },
  ],
});

export default {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/mine',
      handler: 'channel.listMine',
      config: {
        // Every authenticated admin can list active channels: the pickers and
        // the CTB visibility select need it, and content permissions still
        // gate what can be edited on them.
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'GET',
      path: '/',
      handler: 'channel.listAll',
      config: withPermission('read'),
    },
    {
      method: 'POST',
      path: '/',
      handler: 'channel.create',
      config: withPermission('create'),
    },
    {
      method: 'GET',
      path: '/overrides/:uid/:documentId',
      handler: 'overrides.state',
      config: { policies: ['admin::isAuthenticatedAdmin'] },
    },
    {
      method: 'POST',
      path: '/overrides/:uid/:documentId/reset',
      handler: 'overrides.reset',
      config: withPermission('reset'),
    },
    {
      method: 'GET',
      path: '/:id',
      handler: 'channel.findOne',
      config: withPermission('read'),
    },
    {
      method: 'PUT',
      path: '/:id',
      handler: 'channel.update',
      config: withPermission('update'),
    },
    {
      method: 'DELETE',
      path: '/:id',
      handler: 'channel.delete',
      config: withPermission('delete'),
    },
  ],
};
