'use strict';

const path = require('path');

module.exports = ({ env }) => ({
  graphql: {
    enabled: true,
    // resolve: '@strapi/plugin-graphql',
    config: require('./plugins/graphql')({ env }),
  },
  i18n: {
    config: require('./plugins/i18n')({ env }),
  },
});
