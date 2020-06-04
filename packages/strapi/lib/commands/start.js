'use strict';

const strapi = require('../index');

/**
 * `$ strapi start`
 */
module.exports = ({ typescript }) => {
  if (typescript) {
    require('ts-node/register');
    require('tsconfig-paths/register');
  }

  strapi().start();
};
