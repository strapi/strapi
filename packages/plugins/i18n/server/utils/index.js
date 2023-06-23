'use strict';

const { strapi } = require('@strapi/strapi');

const getCoreStore = () => {
  return strapi.store({ type: 'plugin', name: 'i18n' });
};

// retrieve a local service
const getService = (name) => {
  return strapi.plugin('i18n').service(name);
};

module.exports = {
  getService,
  getCoreStore,
};
