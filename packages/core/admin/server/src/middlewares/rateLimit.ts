import type { Context, Next } from 'koa';
import path from 'path';
import utils from '@strapi/utils';
import { isString, has, toLower, get } from 'lodash/fp';
import type { Core } from '@strapi/types';

const { RateLimitError } = utils.errors;

export default (config: any, { strapi }: { strapi: Core.Strapi }) =>
  async (ctx: Context, next: Next) => {
    let rateLimitConfig = strapi.config.get('admin.rateLimit') as any;

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

      const requestPath = isString(ctx.request.path)
        ? toLower(path.normalize(ctx.request.path)).replace(/\/$/, '')
        : 'invalidPath';

      const loadConfig = {
        interval: { min: 5 },
        max: 5,
        prefixKey: `${userEmail}:${requestPath}:${ctx.request.ip}`,
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
