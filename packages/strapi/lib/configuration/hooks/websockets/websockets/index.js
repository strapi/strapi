'use strict';

/**
 * Module dependencies
 */

/**
 * WebSockets hook
 */

module.exports = strapi => {
  return {

    /**
     * Default options
     */

    defaults: {
      websockets: true
    },

    /**
     * Initialize the hook
     */

    initialize: cb => {
      if (strapi.config.websockets === true) {
        global.io = require('socket.io')(strapi.server);
      }

      cb();
    }
  };
};
