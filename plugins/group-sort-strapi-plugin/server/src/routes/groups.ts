const routes = [
  {
    method: 'GET',
    path: '/itemsAndGroups/:uid',
    handler: `groups.getItemsWithGroups`
  },
  {
    method: 'GET',
    path: '/groups/:uid',
    handler: 'groups.getGroupsWithItems'
  },
  {
    method: 'GET',
    path: '/groups/:uid/:groupField/:groupName',
    handler: 'groups.getGroup'
  },
  {
    method: 'GET',
    path: '/group-names/:uid',
    handler: 'groups.getGroupNames'
  },
];

export const adminRoutes = routes.map(route => ({
  ...route,
  config: {
    policies: ['admin::isAuthenticatedAdmin'],
  },
}));

export const contentApiRoutes = routes.map(route => ({
  ...route,
  config: {
    policies: [],
  },
}));