'use strict';

module.exports = ({ strapi }) => {
  if (strapi.plugin('graphql')) {
    require('./graphql')({ strapi });
  }
};
