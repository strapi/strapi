import type { Context, Next } from 'koa';
import path from 'path';
import utils from '@strapi/utils';
import { isString, has, toLower, get } from 'lodash/fp';
import type { Core } from '@strapi/types';
import Redis from 'ioredis';
import { RateLimiterRedis } from 'rate-limiter-flexible';

const { RateLimitError } = utils.errors;

// Create Redis client
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
});

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

      // Create rate limiter instance with merged config
      const rateLimiter = new RateLimiterRedis({
        storeClient: redis,
        keyPrefix: loadConfig.prefixKey,
        points: loadConfig.max,
        duration: loadConfig.interval.min * 60,
        blockDuration: loadConfig.interval.min * 60,
      });

      try {
        await rateLimiter.consume(loadConfig.prefixKey);
        return next();
      } catch (err) {
        return loadConfig.handler();
      }
    }

    return next();
  };
