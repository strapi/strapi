'use strict';
const chalk = require('chalk');

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
      const { exposeInContext, requests } = strapi.config.middleware.settings.logger;

      const { levels: logLevels, level: currentLogLevel } = strapi.log;

      if (exposeInContext) {
        strapi.app.context.log = strapi.log;
      }

      if (requests && currentLogLevel >= logLevels.debug) {
        strapi.app.use(async (ctx, next) => {
          const start = Date.now();
          await next();
          const delta = Math.ceil(Date.now() - start);

          strapi.log.http(`${ctx.method} ${ctx.url} (${delta} ms) ${codeToColor(ctx.status)}`);
        });
      }
    },
  };
};
