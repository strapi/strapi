module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/database/dump',
      handler: 'database.dump',
      config: {
        auth: false,
        policies: [],
      },
    },
  ],
};
