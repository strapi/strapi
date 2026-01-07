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
    // We expect this error message to be obfuscated by the error handling middleware when running on production mode.
    throw new errors.ForbiddenError(
      'Content-Type Builder modifications are disabled in production mode. Schema changes can only be made when running with autoReload enabled (strapi develop).'
    );
  }

  await next();
};
