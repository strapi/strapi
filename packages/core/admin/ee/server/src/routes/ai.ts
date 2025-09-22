export default {
  type: 'admin',
  routes: [
    // ai data usage
    {
      method: 'GET',
      path: '/ai-usage',
      handler: 'admin.getAiUsage',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
  ],
};
