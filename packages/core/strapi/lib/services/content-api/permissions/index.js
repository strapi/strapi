'use strict';

const providers = require('./providers');
const createPermissionEngine = require('./engine');

module.exports = {
  providers,
  createPermissionEngine,
};
