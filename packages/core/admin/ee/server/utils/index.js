'use strict';

const getService = (name, { strapi } = { strapi: global.strapi }) => {
  return strapi.service(`admin::${name}`);
};
module.exports = {
  getService,
};
