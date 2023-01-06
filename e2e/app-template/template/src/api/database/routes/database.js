module.exports = {
  routes: [
    {
      method: 'POST',
      // /api/database/dump
      path: '/database/dump',
      handler: 'database.dump',
      config: {
        auth: false,
        policies: [],
      },
    },
  ],
};
