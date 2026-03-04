import type { Context, Next } from 'koa';
import { errors } from '@strapi/utils';

/**
 * Middleware to ensure Content-Type Builder modifications only happen in development mode
 * This prevents SQL injection vulnerabilities in production by blocking schema modifications
 * when autoReload is disabled.
 */
export default async (ctx: Context, next: Next) => {
  const autoReload = strapi.config.get('autoReload');

  if (autoReload !== true) {
    // Using a PolicyError to throw a publicly visible message in the API
    throw new errors.PolicyError(
      'Content-Type Builder modifications are disabled in production mode. Schema changes can only be made when running with autoReload enabled (strapi develop).'
    );
  }

  await next();
};
