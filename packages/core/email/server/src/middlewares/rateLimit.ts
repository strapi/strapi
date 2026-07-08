import type { Context, Next } from 'koa';
import utils, { importModule } from '@strapi/utils';
import { isString, get } from 'lodash/fp';
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
    const pluginConfig = strapi.config.get('plugin::email') as any;
    const rateLimitConfig = {
      enabled: true,
      ...(pluginConfig.ratelimit || {}),
    };

    if (rateLimitConfig.enabled === true) {
      const { RateLimit } = await getRateLimit();

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

      return RateLimit.middleware(loadConfig)(ctx, next);
    }

    return next();
  };
