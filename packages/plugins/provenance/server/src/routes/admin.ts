const adminPolicies = (action: string) => [
  'admin::isAuthenticatedAdmin',
  { name: 'admin::hasPermissions', config: { actions: [action] } },
];

/**
 * Entry routes check the content-manager permission of the targeted content type in the
 * controller, since the content type is a route parameter.
 */
export default {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/entries/:uid/:documentId',
      handler: 'entries.find',
      config: { policies: ['admin::isAuthenticatedAdmin'] },
    },
    {
      method: 'GET',
      path: '/summary/:uid',
      handler: 'entries.summary',
      config: { policies: ['admin::isAuthenticatedAdmin'] },
    },
    {
      method: 'GET',
      path: '/entries/:uid/:documentId/export',
      handler: 'entries.export',
      config: { policies: ['admin::isAuthenticatedAdmin'] },
    },
    {
      method: 'POST',
      path: '/entries/:uid/:documentId/review',
      handler: 'entries.review',
      config: { policies: ['admin::isAuthenticatedAdmin'] },
    },
    {
      method: 'POST',
      path: '/entries/:uid/:documentId/declare',
      handler: 'entries.declare',
      config: { policies: ['admin::isAuthenticatedAdmin'] },
    },
    {
      method: 'GET',
      path: '/settings',
      handler: 'settings.find',
      config: { policies: adminPolicies('plugin::provenance.settings.read') },
    },
    {
      method: 'PUT',
      path: '/settings',
      handler: 'settings.update',
      config: { policies: adminPolicies('plugin::provenance.settings.update') },
    },
    {
      method: 'GET',
      path: '/tokens',
      handler: 'tokens.find',
      config: { policies: adminPolicies('admin::api-tokens.read') },
    },
    {
      method: 'PUT',
      path: '/tokens/:id',
      handler: 'tokens.update',
      config: { policies: adminPolicies('admin::api-tokens.update') },
    },
  ],
};
