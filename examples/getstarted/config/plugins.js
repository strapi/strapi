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
  documentation: {
    config: {
      info: {
        version: '2.0.0',
      },
    },
  },
  myplugin: {
    enabled: true,
    resolve: `./src/plugins/myplugin`, // From the root of the project
    config: {
      testConf: 3,
    },
  },
  mycustomfields: {
    enabled: true,
    resolve: `./src/plugins/mycustomfields`,
  },
});
