const withPermission = (action: string) => ({
  policies: [
    'admin::isAuthenticatedAdmin',
    { name: 'admin::hasPermissions', config: { actions: [`plugin::branches.${action}`] } },
  ],
});

export default {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/mine',
      handler: 'branch.listMine',
      config: {
        // Every authenticated admin can list branches: the picker needs it and
        // content permissions still gate what can be edited on them.
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'GET',
      path: '/states',
      handler: 'changes.states',
      config: { policies: ['admin::isAuthenticatedAdmin'] },
    },
    {
      method: 'GET',
      path: '/',
      handler: 'branch.listAll',
      config: withPermission('read'),
    },
    {
      method: 'POST',
      path: '/',
      handler: 'branch.create',
      config: withPermission('create'),
    },
    {
      method: 'GET',
      path: '/:id',
      handler: 'branch.findOne',
      config: withPermission('read'),
    },
    {
      method: 'PUT',
      path: '/:id',
      handler: 'branch.update',
      config: withPermission('update'),
    },
    {
      method: 'DELETE',
      path: '/:id',
      handler: 'branch.delete',
      config: withPermission('delete'),
    },
    {
      method: 'GET',
      path: '/:id/changes',
      handler: 'changes.list',
      config: withPermission('read'),
    },
    {
      method: 'GET',
      path: '/:id/changes/:uid/:documentId',
      handler: 'changes.diff',
      config: withPermission('read'),
    },
    {
      method: 'DELETE',
      path: '/:id/changes/:uid/:documentId',
      handler: 'changes.discard',
      config: withPermission('update'),
    },
    {
      method: 'POST',
      path: '/:id/merge',
      handler: 'merge.merge',
      config: withPermission('merge'),
    },
  ],
};
