'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const { resolve } = require('path');
const favicon = require('koa-favicon');

/**
 * Favicon hook
 */

module.exports = strapi => {
  return {
    /**
     * Initialize the hook
     */

    initialize() {
      const { maxAge, path: faviconPath } = strapi.config.middleware.settings.favicon;

      strapi.server.use(
        favicon(resolve(strapi.dirs.root, faviconPath), {
          maxAge,
        })
      );
    },
  };
};
