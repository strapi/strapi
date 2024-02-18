module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/config/ratelimit/enable',
      handler: 'config.rateLimitEnable',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/config/permissions/prune',
      handler: 'config.permissionsPrune',
      config: {
        auth: false,
      },
    },
  ],
};
