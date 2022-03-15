'use strict';

const strapi = require('../index');

/**
 * `$ strapi start`
 */
module.exports = distDir => strapi({ distDir }).start();
