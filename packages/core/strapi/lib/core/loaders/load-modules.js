/**
 * Load Modules is the root module loader.
 * This is where all the strapi enviornment is laoded
 * - APIs
 * - Plugins
 * - Hooks
 * - Middlewres
 * - Components
 * - ContentTypes
 */
'use strict';

const loadApis = require('./load-apis');

// const loadPlugins = require('./load-plugins');

const loadMiddlewares = require('./load-middlewares');
const loadExtensions = require('./load-extensions');
const loadComponents = require('./load-components');

module.exports = async strapi => {
  const [api, middlewares, extensions, components] = await Promise.all([
    loadApis(strapi),
    loadMiddlewares(strapi),
    loadExtensions(strapi),
    loadComponents(strapi),
  ]);

  // TODO: move this into the appropriate loaders

  /**
   * Handle plugin extensions
   */
  // merge extensions config folders
  // _.mergeWith(plugins, extensions.merges, (objValue, srcValue, key) => {
  //   // concat routes
  //   if (_.isArray(srcValue) && _.isArray(objValue) && key === 'routes') {
  //     return srcValue.concat(objValue);
  //   }
  // });

  // // overwrite plugins with extensions overwrites
  // extensions.overwrites.forEach(({ path, mod }) => {
  //   _.assign(_.get(plugins, path), mod);
  // });

  return {
    api,
    middlewares,
    extensions,
    components,
  };
};
