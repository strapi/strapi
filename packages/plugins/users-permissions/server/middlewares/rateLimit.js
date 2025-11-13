'use strict';

const path = require('path');
const utils = require('@strapi/utils');
const { isString, has, toLower } = require('lodash/fp');

const { RateLimitError } = utils.errors;

module.exports =
  (config, { strapi }) =>
  async (ctx, next) => {
    let rateLimitConfig = strapi.config.get('plugin::users-permissions.ratelimit');

    if (!rateLimitConfig) {
      rateLimitConfig = {
        enabled: true,
      };
    }

    if (!has('enabled', rateLimitConfig)) {
      rateLimitConfig.enabled = true;
    }

    const getPrefixKey = () => {
      const userIdentifier = toLower(ctx.request.body.email) || 'unknownIdentifier';
      const requestPath = isString(ctx.request.path)
        ? toLower(path.normalize(ctx.request.path))
        : 'invalidPath';

      console.log(requestPath);

      // specifically look through routes the middleware is enabled on and remove the `userIdentifier` from the prefixKey in those cases
      // this won't help with user's who inject this middleware into custom routes but they can manually define the prefixKey to fit their needs

      const routesWithoutIdentifier = [
        // todo, add the routes here manually and statically for now. In the future we could probably base it on types
        // but that would require more work to extract those routes at this point
      ];

      if (requestPath in routesWithoutIdentifier) {
        return `noIdentifier:${requestPath}:${ctx.request.ip}`;
      }

      return `${userIdentifier}:${requestPath}:${ctx.request.ip}`;
    };

    if (rateLimitConfig.enabled === true) {
      const rateLimit = require('koa2-ratelimit').RateLimit;

      const loadConfig = {
        interval: { min: 5 },
        max: 5,
        prefixKey: getPrefixKey(),
        handler() {
          throw new RateLimitError();
        },
        ...rateLimitConfig,
        ...config,
      };

      return rateLimit.middleware(loadConfig)(ctx, next);
    }

    return next();
  };
