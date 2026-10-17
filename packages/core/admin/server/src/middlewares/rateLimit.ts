import { get, isString, has } from 'lodash';
import type { Context, Next } from 'koa';
import path from 'path';
import { errors } from '@strapi/utils';

import type { Core } from '@strapi/types';

const { RateLimitError } = errors;

/**
 * The bucket a request is counted against.
 *
 * Unauthenticated, the only identity on offer is the email in the body, so the key is
 * `<email>:<path>:<ip>` -- and a body without one degrades to `unknownEmail`, one bucket per path
 * and address. That is acceptable on `/login`, which always carries an email.
 *
 * With a session it is wrong twice over. The key collapses to one bucket for every administrator
 * behind an address, so colleagues lock each other out; and it varies with the concrete path, so
 * a route with a parameter hands the caller a fresh bucket per value -- an unbounded password
 * oracle wherever the handler checks a credential before it knows whether the id is theirs. So an
 * authenticated request is keyed on the account and the route *pattern*: every attempt against
 * one account on one route lands in one bucket, from any address, whatever the parameters.
 */
export const rateLimitKey = (ctx: Context): string => {
  const sessionUserId: unknown = ctx.state?.user?.id;

  if (sessionUserId !== undefined && sessionUserId !== null) {
    const route = ctx.state?.route as { method?: string; path?: string } | undefined;
    const pattern = route?.path ? `${route.method ?? ctx.method}:${route.path}` : ctx.method;
    return `user:${String(sessionUserId)}:${pattern.toLowerCase()}`;
  }

  const requestEmail = get(ctx, 'request.body.email');
  const userEmail = isString(requestEmail) ? requestEmail.toLowerCase() : 'unknownEmail';

  const requestPath = isString(ctx.request.path)
    ? path.normalize(ctx.request.path).toLowerCase().replace(/\/$/, '')
    : 'invalidPath';

  return `${userEmail}:${requestPath}:${ctx.request.ip}`;
};

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

    if (rateLimitConfig.enabled === true) {
      // TODO: TS - Do the dynamic import
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const rateLimit = require('koa2-ratelimit').RateLimit;

      const loadConfig = {
        interval: { min: 5 },
        max: 5,
        prefixKey: rateLimitKey(ctx),
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
