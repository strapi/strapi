'use strict';

module.exports = (strapi) => {
  strapi.container.get('validators').set('content-api', { input: [], query: [] });
};
