import type { Context } from 'koa';
import type { AdminUser } from '../../../shared/contracts/shared';

import { getService } from '../utils';
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
    const input = ctx.request.body as UpdateMe.Request['body'];

    const data = (await validateProfileUpdateInput(input)) as UpdateMe.Request['body'];

    const userService = getService('user');
    const authServer = getService('auth');

    const { currentPassword, ...userInfo } = data;

    if (currentPassword && userInfo.password) {
      const isValid = await authServer.validatePassword(currentPassword, ctx.state.user.password);

      if (!isValid) {
        return ctx.badRequest('ValidationError', {
          currentPassword: ['Invalid credentials'],
        });
      }

      // Invalidate all sessions when password changes for security
      const sessionManager = getSessionManager();
      if (sessionManager && sessionManager.hasOrigin('admin')) {
        await sessionManager('admin').invalidateRefreshToken(String(ctx.state.user.id));
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
