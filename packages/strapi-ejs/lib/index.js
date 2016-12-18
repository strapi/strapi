'use strict';

/**
 * Module dependencies
 */

// Native
const path = require('path');

// Externals
const co = require('co');
const render = require('koa-ejs');

/**
 * EJS hook
 */

module.exports = function (strapi) {
  const hook = {

    /**
     * Default options
     */

    defaults: {},

    /**
     * Initialize the hook
     */

    initialize: cb => {
      render(strapi.app, {
        root: path.join(strapi.config.appPath, strapi.config.paths.views),
        layout: 'layout',
        viewExt: 'ejs',
        cache: false,
        debug: true
      });

      strapi.app.context.render = co.wrap(strapi.app.context.render);

      cb();
    }
  };

  return hook;
};
