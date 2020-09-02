'use strict';
const chalk = require('chalk');
const _ = require('lodash');

const codeToColor = code => {
  return code >= 500
    ? chalk.red(code)
    : code >= 400
    ? chalk.yellow(code)
    : code >= 300
    ? chalk.cyan(code)
    : code >= 200
    ? chalk.green(code)
    : code;
};

/**
 * Logger hook
 */

module.exports = strapi => {
  return {
    /**
     * Initialize the hook
     */
    initialize() {
      const { level, exposeInContext, requests } = strapi.config.middleware.settings.logger;

      const logLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];

      if (!_.includes(logLevels, level)) {
        throw new Error(
          'Invalid log level. The value is set middleware configuration. Accepted values are (' +
            logLevels.join(', ') +
            ').'
        );
      }
      strapi.log.level = level;

      if (exposeInContext) {
        strapi.app.context.log = strapi.log;
      }

      if (requests && strapi.log.levelVal <= 20) {
        strapi.app.use(async (ctx, next) => {
          const start = Date.now();
          await next();
          const delta = Math.ceil(Date.now() - start);
          strapi.log.debug(`${ctx.method} ${ctx.url} (${delta} ms) ${codeToColor(ctx.status)}`);
        });
      }
    },
  };
};
