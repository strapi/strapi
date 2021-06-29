'use strict';

module.exports = (/* strapi, config */) => {
  return {
    bootstrap: () => {
      console.log('documentation BOOTSTRAP');
    },
    destroy: () => {
      console.log('documentation DESTROY');
    },
    config: {},
    routes: [],
    controllers: {},
    services: () => {},
    policies: {},
    middlewares: {},
    contentTypes: [],
  };
};
