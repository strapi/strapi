export default () => ({
  graphql: {
    enabled: true,
    config: {
      endpoint: '/graphql',
      defaultLimit: 25,
      maxLimit: 100,
      /** Apollo Server v5 (opt-in). */
      server: {
        provider: 'apollo',
        version: 5,
        options: {},
      },
    },
  },
});
