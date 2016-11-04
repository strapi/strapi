'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');

// Public modules
const _ = require('lodash');
const Koa = require('koa');

/**
 * Public assets hook
 */

module.exports = strapi => {
  return {

    /**
     * Default options
     */

    defaults: {
      static: true
    },

    /**
     * Initialize the hook
     */

    initialize: cb => {
      if (strapi.config.static === true) {
        strapi.app.use(strapi.middlewares.static(path.resolve(strapi.config.appPath, strapi.config.paths.static), {
          gzip: true
        }));
      }

      // Mount static to a specific path (pattern: `/plugins/xXx`)
      _.forEach(strapi.plugins, (value, plugin) => {
        // Create koa sub-app
        const app = new Koa();

        app.use(strapi.middlewares.static(path.resolve(strapi.config.appPath, 'plugins', plugin, strapi.config.paths.static), {
          gzip: true
        }));

        strapi.app.use(strapi.middlewares.mount(path.join('/plugins', plugin), app));
      });

      cb();
    }
  };
};
