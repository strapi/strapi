export default {
  type: 'admin',
  routes: [
    // ai data usage
    {
      method: 'GET',
      path: '/ai-usage',
      handler: 'ai.getAiUsage',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    // get ai token
    {
      method: 'GET',
      path: '/ai-token',
      handler: 'ai.getAiToken',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    // get ai feature settings
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
