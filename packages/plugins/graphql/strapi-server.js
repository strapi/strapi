'use strict';

module.exports = (/* strapi, config */) => {
  return {
    bootstrap: () => {
      console.log('graphQL BOOTSTRAP');
    },
    destroy: () => {
      console.log('graphQL DESTROY');
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
