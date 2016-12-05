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

        if (strapi.config.reload.workers > 0) {
          strapi.log.warn('Strapi doesn\'t handle WebSockets using multiple nodes yet.');
          strapi.log.warn('WebSockets only work on the master process.');
          strapi.log.warn('You can disable the `websockets` and implement Socket.IO on your own.');
          strapi.log.warn('Feel free to join us on Slack to talk about it: http://slack.strapi.io/');
        }
      }

      cb();
    }
  };
};
