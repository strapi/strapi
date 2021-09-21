'use strict';

const path = require('path');

module.exports = ({ env }) => ({
  graphql: {
    enabled: true,
    config: {
      amountLimit: 50,
      depthLimit: 10,
      apolloServer: {
        tracing: true,
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
});
