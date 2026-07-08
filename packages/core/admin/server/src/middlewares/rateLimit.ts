import type { Context, Next } from 'koa';
import path from 'path';
import utils, { importModule } from '@strapi/utils';
import { isString, has, toLower, get } from 'lodash/fp';
import type { Core } from '@strapi/types';

const { RateLimitError } = utils.errors;

interface Koa2RateLimitModule {
  RateLimit: {
    middleware: (config: Record<string, unknown>) => (ctx: Context, next: Next) => Promise<unknown>;
  };
}
let rateLimitModulePromise: Promise<Koa2RateLimitModule> | undefined;

const getRateLimit = async () => {
  rateLimitModulePromise ??= importModule<Koa2RateLimitModule>('koa2-ratelimit');
  return rateLimitModulePromise;
};

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
      const { RateLimit } = await getRateLimit();

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

      return RateLimit.middleware(loadConfig)(ctx, next);
    }

    return next();
  };
