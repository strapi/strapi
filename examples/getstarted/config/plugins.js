'use strict';

module.exports = () => ({
  graphql: {
    enabled: true,
    config: {
      endpoint: '/graphql',

      defaultLimit: 25,
      maxLimit: 100,

      apolloServer: {
        tracing: true,
      },
    },
  },
  myplugin: {
    enabled: true,
    resolve: `./plugins/myplugin`, // From the root of the project
    config: {
      testConf: 3,
    },
  },
});
