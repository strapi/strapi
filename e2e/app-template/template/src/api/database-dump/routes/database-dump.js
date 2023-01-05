module.exports = {
  routes: [
    {
      method: 'POST',
      // /api/database-dump
      path: '/database-dump',
      handler: 'database-dump.dump',
      config: {
        auth: false,
        policies: [],
      },
    },
  ],
};
