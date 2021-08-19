'use strict';

const getService = name => {
  return strapi.plugin('upload').service(name);
};

module.exports = {
  getService,
};
