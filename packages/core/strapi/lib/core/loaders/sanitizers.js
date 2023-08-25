'use strict';

module.exports = (strapi) => {
  strapi.container.get('sanitizers').set('content-api', { input: [], output: [], query: [] });
};
