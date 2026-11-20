import { get, isString, has } from 'lodash';
import type { Context, Next } from 'koa';
import path from 'path';
import { errors } from '@strapi/utils';

import type { Core } from '@strapi/types';

const { RateLimitError } = errors;

export default (config: any, { strapi }: { strapi: Core.Strapi }) =>
  async (ctx: Context, next: Next) => {
    let rateLimitConfig = strapi.config.get('admin.rateLimit') as any;

    if (!rateLimitConfig) {
      rateLimitConfig = {
        enabled: true,
      };
    }

    if (!has(rateLimitConfig, 'enabled')) {
      rateLimitConfig.enabled = true;
    }

    // A route-level `enabled` wins over the global admin.rateLimit.enabled, so a route
    // with its own rate-limit settings (e.g. MCP OAuth client registration) can be
    // toggled independently of the admin authentication endpoints.
    const { enabled: routeEnabled, ...routeConfig } = (config ?? {}) as Record<string, unknown>;
    const enabled =
      typeof routeEnabled === 'boolean' ? routeEnabled : rateLimitConfig.enabled === true;

    if (enabled) {
      // TODO: TS - Do the dynamic import
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const rateLimit = require('koa2-ratelimit').RateLimit;

      const requestEmail = get(ctx, 'request.body.email');
      const userEmail = isString(requestEmail) ? requestEmail.toLowerCase() : 'unknownEmail';

      const requestPath = isString(ctx.request.path)
        ? path.normalize(ctx.request.path).toLowerCase().replace(/\/$/, '')
        : 'invalidPath';

      const loadConfig = {
        interval: { min: 5 },
        max: 5,
        prefixKey: `${userEmail}:${requestPath}:${ctx.request.ip}`,
        handler() {
          throw new RateLimitError();
        },
        ...rateLimitConfig,
        ...routeConfig,
      };

      return rateLimit.middleware(loadConfig)(ctx, next);
    }

    return next();
  };
