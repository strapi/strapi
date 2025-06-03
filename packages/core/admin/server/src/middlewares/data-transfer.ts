import type { Context, Next } from 'koa';

import { getService } from '../utils';

export default () => async (ctx: Context, next: Next) => {
  const transferUtils = getService('transfer').utils;

  const { hasValidTokenSalt, isRemoteTransferEnabled } = transferUtils;

  // verify that data transfer is enabled
  if (isRemoteTransferEnabled()) {
    return next();
  }

  // if it has been manually disabled, return a not found
  if (strapi.config.get('server.transfer.remote.enabled') === false) {
    return ctx.notFound();
  }

  // if it's enabled but doesn't have a valid salt, throw a not implemented
  if (!hasValidTokenSalt()) {
    return ctx.notImplemented(
      'The server configuration for data transfer is invalid. Please contact your server administrator.',
      {
        code: 'INVALID_TOKEN_SALT',
      }
    );
  }

  // This should never happen as long as we're handling individual scenarios above
  throw new Error('Unexpected error while trying to access a data transfer route');
};
