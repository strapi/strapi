export default {
  routes: [
    {
      method: 'GET',
      path: '/stats',
      handler: 'api::stats.stats.summary',
    },
  ],
};
