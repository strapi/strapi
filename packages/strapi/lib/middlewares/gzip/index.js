'use strict';

/**
 * Gzip hook
 */

module.exports = strapi => {
  return {
    /**
     * Initialize the hook
     */

    initialize: cb => {
      strapi.app.use(strapi.koaMiddlewares.compress());

      cb();
    }
  };
};
