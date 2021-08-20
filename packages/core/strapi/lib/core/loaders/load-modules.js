'use strict';

const loadApis = require('./load-apis');
const loadMiddlewares = require('./load-middlewares');
const loadComponents = require('./load-components');

module.exports = async strapi => {
  const [api, middlewares, components] = await Promise.all([
    loadApis(strapi),
    loadMiddlewares(strapi), // TODO: load in the middleware registry directly
    loadComponents(strapi),
  ]);

  // TODO: move this into the appropriate loaders

  return {
    api,
    middlewares,
    components,
  };
};
