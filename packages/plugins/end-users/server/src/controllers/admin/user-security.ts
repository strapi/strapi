import type Koa from 'koa';
import type { Core } from '@strapi/types';

import { PLUGIN_ID } from '../../constants';
import type userSecurityService from '../../services/user-security';
import type { SecurityAccess } from '../../services/user-security';
import { isPlain } from '../../utils/is-plain';

type Plain = Record<string, unknown>;

/**
 * `/end-users/users/:documentId/security` and its actions: the Content Manager's Security panel of
 * one end user. Answers are `{ data }`, as every admin route's are, and never carry a session
 * token.
 *
 * There is no admin action of the plugin's behind these routes: the admin needs the
 * Content Manager's `explorer.read` on the end-user type to read, and `explorer.update` to change
 * anything. The check is the service's `authorize`, run first on every route, and it also limits
 * which users the admin reaches to the ones they may read.
 *
 * Every change tells `strapi.eventHub` once it has been made, so a refused one is never reported:
 * `end-users.user.<change>`, with the admin who did it and the user's `documentId`.
 */
const userSecurityController = ({ strapi }: { strapi: Core.Strapi }) => {
  const security = () =>
    strapi.plugin(PLUGIN_ID).service('user-security') as ReturnType<typeof userSecurityService>;

  const authorize = async (ctx: Koa.Context, access: SecurityAccess): Promise<string> => {
    const { documentId } = ctx.params;

    await security().authorize(ctx.state.userAbility, access, documentId);

    return documentId;
  };

  const emit = (ctx: Koa.Context, change: string, documentId: string) => {
    strapi.eventHub.emit(`end-users.user.${change}`, {
      adminUserId: ctx.state.user?.documentId,
      user: { documentId },
    });
  };

  /** A change that answers `{ data: { ok: true } }` once it is made */
  const change =
    (
      access: 'update',
      name: string,
      run: (documentId: string, ctx: Koa.Context) => Promise<void>
    ) =>
    async (ctx: Koa.Context) => {
      const documentId = await authorize(ctx, access);

      await run(documentId, ctx);

      emit(ctx, name, documentId);
      ctx.body = { data: { ok: true } };
    };

  return {
    async find(ctx: Koa.Context) {
      const documentId = await authorize(ctx, 'read');

      ctx.body = { data: await security().get(documentId) };
    },

    async effectivePermissions(ctx: Koa.Context) {
      const documentId = await authorize(ctx, 'read');

      ctx.body = { data: await security().effectivePermissions(documentId) };
    },

    revokeSession: change('update', 'session-revoke', (documentId, ctx) =>
      security().revokeSession(documentId, ctx.params.sessionId)
    ),

    revokeSessions: change('update', 'sessions-revoke', (documentId) =>
      security().revokeSessions(documentId)
    ),

    unlinkAccount: change('update', 'account-unlink', (documentId, ctx) =>
      security().unlinkAccount(documentId, ctx.params.accountId)
    ),

    ban: change('update', 'ban', (documentId, ctx) => {
      const { body } = ctx.request;
      const { reason, expiresAt } = isPlain(body) ? body : ({} as Plain);

      return security().ban(documentId, { reason, expiresAt });
    }),

    unban: change('update', 'unban', (documentId) => security().unban(documentId)),

    unlock: change('update', 'unlock', (documentId) => security().unlock(documentId)),

    resetTwoFactor: change('update', 'two-factor-reset', (documentId) =>
      security().resetTwoFactor(documentId)
    ),

    sendPasswordReset: change('update', 'password-reset-send', (documentId) =>
      security().sendPasswordReset(documentId)
    ),

    sendVerification: change('update', 'verification-send', (documentId) =>
      security().sendVerification(documentId)
    ),
  };
};

export default userSecurityController;
