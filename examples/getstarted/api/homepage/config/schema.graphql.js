module.exports = {
  query: `
    testQuery: Homepage
  `,
  resolver: {
    Query: {
      testQuery: {
        policies: ['plugin::users-permissions.isAuthenticated'],
        resolver: 'api::homepage.homepage.find',
      },
    },
  },
};
