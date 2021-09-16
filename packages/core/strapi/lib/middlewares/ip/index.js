'use strict';

const ip = require('koa-ip');
/**
 * IP filter hook
 */

module.exports = strapi => {
  return {
    /**
     * Initialize the hook
     */

    initialize() {
      const { whiteList, blackList } = strapi.config.middleware.settings.ip;

      strapi.server.use(
        ip({
          whitelist: whiteList,
          blacklist: blackList,
        })
      );
    },
  };
};
