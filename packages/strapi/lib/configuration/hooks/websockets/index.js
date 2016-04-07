'use strict';

/**
 * WebSockets hook
 */

module.exports = function (strapi) {
  const hook = {

    /**
     * Default options
     */

    defaults: {
      websockets: true
    },

    /**
     * Initialize the hook
     */

    initialize: function (cb) {
      if (strapi.config.websockets === true) {
        global.io = require('socket.io')(strapi.app);
      }

      cb();
    }
  };

  return hook;
};
