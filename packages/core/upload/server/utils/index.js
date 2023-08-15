'use strict';

const strapi = require('@strapi/strapi');

const getService = (name) => {
  return strapi.plugin('upload').service(name);
};

module.exports = {
  getService,
};
