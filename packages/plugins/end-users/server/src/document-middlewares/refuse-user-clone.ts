import { errors } from '@strapi/utils';
import type { Modules } from '@strapi/types';

import { USER_UID } from '../constants';

const MESSAGE = 'Users cannot be cloned';

/**
 * `refuse-user-clone`: a user is never copied through the Document Service. A clone would carry the
 * ban, the verified email and the two-factor state of the user to a new one, and none of it belongs
 * to a person who has not earned it. It is a rule about what a user is, so it holds for every
 * caller (the Content Manager's clone button included), and it is not a permission check.
 */
export const refuseUserCloneMiddleware: Modules.Documents.Middleware.Middleware = async (
  ctx,
  next
) => {
  if (ctx.uid === USER_UID && ctx.action === 'clone') {
    throw new errors.ValidationError(MESSAGE, {
      errors: [{ path: [], message: MESSAGE, name: 'ValidationError' }],
    });
  }

  return next();
};
