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
  ],
};
