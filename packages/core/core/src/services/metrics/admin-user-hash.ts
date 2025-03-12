import crypto from 'crypto';
import type { Core } from '@strapi/types';

/**
 * Generate an admin user hash
 */
const generateAdminUserHash = (strapi: Core.Strapi) => {
  const uuid = strapi.config.get('uuid');
  const ctx = strapi?.requestContext?.get();

  if (!ctx?.state?.user?.email) {
    return '';
  }
  return crypto
    .createHash('sha256')
    .update(uuid ? `${ctx.state.user.email}-${uuid}` : ctx.state.user.email)
    .digest('hex');
};

export { generateAdminUserHash };
