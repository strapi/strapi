'use strict';

const strapi = require('../index');

/**
 * `$ strapi start`
 */
module.exports = async function({ migrate }) {
  return strapi({ migrate }).start();
};
