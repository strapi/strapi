'use strict';

const sanitize = require('./sanitize');

const getService = (name) => {
  return strapi.plugin('users-permissions').service(name);
};

module.exports = {
  getService,
  sanitize,
};
