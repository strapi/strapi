'use strict';

const strapi = require('../index');

/**
 * `$ strapi start`
 */
module.exports = ({ dirPath }) => strapi({ dir: dirPath }).start();
