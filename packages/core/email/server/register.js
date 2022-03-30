'use strict';

module.exports = ({ strapi }) => {
  if (strapi.plugin('documentation')) {
    require('./documentation')({ strapi });
  }
};
