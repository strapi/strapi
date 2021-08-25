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
});
