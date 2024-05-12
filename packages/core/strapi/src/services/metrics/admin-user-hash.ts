import crypto from 'crypto';
import type { Strapi } from '@strapi/types';

/**
 * Generate an admin user hash
 */
const generateAdminUserHash = (strapi: Strapi) => {
  const ctx = strapi?.requestContext?.get();
  if (!ctx?.state?.user?.email) {
    return '';
  }
  return crypto.createHash('sha256').update(ctx.state.user.email).digest('hex');
};

export { generateAdminUserHash };
