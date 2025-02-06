import type { Context, Next } from 'koa';
import utils from '@strapi/utils';
import { isString, has, get } from 'lodash/fp';
import type { Core } from '@strapi/types';

const { RateLimitError } = utils.errors;

export default (config: any, { strapi }: { strapi: Core.Strapi }) =>
  async (ctx: Context, next: Next) => {
    let rateLimitConfig = strapi.config.get('plugin::email').ratelimit as any;

    if (!rateLimitConfig) {
      rateLimitConfig = {
        enabled: true,
      };
    }

    if (!has('enabled', rateLimitConfig)) {
      rateLimitConfig.enabled = true;
    }

    if (rateLimitConfig.enabled === true) {
      // TODO: TS - Do the dynamic import
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const rateLimit = require('koa2-ratelimit').RateLimit;

      const requestEmail = get('request.body.email')(ctx);
      const userEmail = isString(requestEmail) ? requestEmail.toLowerCase() : 'unknownEmail';

      const loadConfig = {
        interval: { min: 5 },
        max: 5,
        prefixKey: `${userEmail}`,
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
