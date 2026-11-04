import crypto from 'crypto';
import type { Core } from '@strapi/types';

/**
 * Generate an admin user hash
 */
const generateAdminUserHash = (strapi: Core.Strapi) => {
  // destroy() releases the container, then export still sends telemetry.
  // The requestContext getter throws once that service is gone.
  if (!strapi?.has?.('requestContext')) {
    return '';
  }

  const ctx = strapi.requestContext.get();

  if (!ctx?.state?.user?.email) {
    return '';
  }
  return crypto.createHash('sha256').update(ctx.state.user.email).digest('hex');
};

export { generateAdminUserHash };
