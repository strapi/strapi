const resolve = require('path').resolve;

const pullAll = require('lodash/pullAll');
const uniq = require('lodash/uniq');
const merge = require('lodash/uniq');

const StrapiPlugin = {
  /**
   * The DLL Plugin provides a dramatic speed increase to webpack build and hot module reloading
   * by caching the module metadata for all of our npm dependencies. We enable it by default
   * in development.
   *
   *
   * To disable the DLL Plugin, set this value to false.
   */
  dllPlugin: {
    defaults: {
      /**
       * we need to exclude dependencies which are not intended for the browser
       * by listing them here.
       */
      exclude: [
        'chalk',
        'compression',
        'cross-env',
        'express',
        'minimist',
      ],

      /**
       * Specify any additional dependencies here. We include core-js and lodash
       * since a lot of our dependencies depend on them and they get picked up by webpack.
       */
      include: ['core-js', 'eventsource-polyfill', 'babel-polyfill', 'lodash'],

      // The path where the DLL manifest and bundle will get built
      path: resolve('node_modules', 'strapi-plugin-dlls'),
    },

    entry(helperPkg, pluginPkg) {
      const dependencyNames = merge(Object.keys(helperPkg.dependencies), Object.keys(pluginPkg.dependencies));
      const exclude = pluginPkg.dllPlugin.exclude || StrapiPlugin.dllPlugin.defaults.exclude;
      const include = pluginPkg.dllPlugin.include || StrapiPlugin.dllPlugin.defaults.include;
      const includeDependencies = uniq(dependencyNames.concat(include));

      return {
        strapiPluginDeps: pullAll(includeDependencies, exclude),
      };
    },
  },
};

module.exports = StrapiPlugin;
