'use strict';

const path = require('path');

module.exports = ({ env }) => ({
  graphql: {
    enabled: true,
    resolve: path.resolve('./plugins/myplugin'),
  },
});
