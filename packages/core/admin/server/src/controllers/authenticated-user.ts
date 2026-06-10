import type { Context } from 'koa';
import type { AdminUser } from '../../../shared/contracts/shared';

import { getService } from '../utils';
import { normalizeEmail } from '../utils/normalize-email';
import { validateProfileUpdateInput } from '../validation/user';
import { GetMe, GetOwnPermissions, UpdateMe } from '../../../shared/contracts/users';
import { getSessionManager } from '../../../shared/utils/session-auth';

export default {
  async getMe(ctx: Context) {
    const userInfo = getService('user').sanitizeUser(ctx.state.user as AdminUser);

    ctx.body = {
      data: userInfo,
    } satisfies GetMe.Response;
  },

  async updateMe(ctx: Context) {
    const data = normalizeEmail(ctx.request.body as UpdateMe.Request['body']);

    await validateProfileUpdateInput(data);

    const userService = getService('user');
    const authServer = getService('auth');

    const { currentPassword, ...userInfo } = data;

    const isChangingPassword = Boolean(currentPassword && userInfo.password);

    if (isChangingPassword) {
      const isValid = await authServer.validatePassword(currentPassword, ctx.state.user.password);

      if (!isValid) {
        return ctx.badRequest('ValidationError', {
          currentPassword: ['Invalid credentials'],
        });
      }
    }

    if (userInfo.email !== undefined) {
      const emailAlreadyTaken = await userService.exists({
        id: { $ne: ctx.state.user.id },
        email: userInfo.email,
      });

      if (emailAlreadyTaken === true) {
        return ctx.badRequest('ValidationError', {
          email: ['Email already taken'],
        });
      }
    }

    // Invalidate all sessions when password changes for security. This must run only once the
    // update is going to be persisted, so a rejected request (e.g. duplicate email) does not log
    // the user out without applying any change.
    if (isChangingPassword) {
      const sessionManager = getSessionManager();
      if (sessionManager && sessionManager.hasOrigin('admin')) {
        await sessionManager('admin').invalidateRefreshToken(String(ctx.state.user.id));
      }
    }

    const updatedUser = await userService.updateById(ctx.state.user.id, userInfo);

    ctx.body = {
      data: userService.sanitizeUser(updatedUser),
    } satisfies UpdateMe.Response;
  },

  async getOwnPermissions(ctx: Context) {
    const { findUserPermissions, sanitizePermission } = getService('permission');
    const { user } = ctx.state;

    const userPermissions = await findUserPermissions(user as AdminUser);

    ctx.body = {
      // @ts-expect-error - transform response type to sanitized permission
      data: userPermissions.map(sanitizePermission),
    } satisfies GetOwnPermissions.Response;
  },
};
