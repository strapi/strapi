export default {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/ai-usage',
      handler: 'ai.getAiUsage',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'GET',
      path: '/ai-token',
      handler: 'ai.getAiToken',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'GET',
      path: '/ai-feature-config',
      handler: 'ai.getAIFeatureConfig',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
  ],
};
