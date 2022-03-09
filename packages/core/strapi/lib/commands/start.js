'use strict';

const strapi = require('../index');

/**
 * `$ strapi start`
 */
module.exports = dir => strapi({ dir }).start();
