'use strict';

const getService = (name) => {
  return strapi.service(`admin::${name}`);
};

module.exports = {
  getService,
};
