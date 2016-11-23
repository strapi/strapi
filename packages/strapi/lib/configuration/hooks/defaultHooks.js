'use strict';

/**
 * Built-in hooks (order matters)
 */

module.exports = {
  dictionary: {
    _config: true,
    _api: true,
    _admin: true,
    _plugins: true,
    _externalHooks: true
  },
  core: {
    responses: true,
    responseTime: true,
    bodyParser: true,
    compress: true,
    session: true,
    proxy: true,
    ssl: true,
    ip: true,
    cors: true,
    lusca: true,
    favicon: true,
    gzip: true,
    i18n: true,
    cron: true,
    logger: true,
    static: true,
    views: true,
    router: true
  },
  websockets: {
    websockets: true
  },
  models: {}
};
