'use strict';

const _ = require('lodash');
const admin = require('./server');

if (strapi.EE) {
  const eeAdmin = require('./ee/server');

  module.exports = _.merge({}, admin, eeAdmin);
} else {
  module.exports = admin;
}
