import type { Core, Modules } from '@strapi/types';

import { USER_UID } from '../constants';
import { sendEmailChangedNotice } from '../engine/better-auth/plugins/strapi-email';
import type { TransactionHooks } from '../utils/transaction-hooks';
import { normalizeEmail } from '../utils/normalize-email';

/**
 * `notify-email-change`: the old address is told when a user's email changes, whoever changes it.
 * Better Auth writes a verified change of address through the Document Service, as does an
 * administrator's edit in the Content Manager, so this one rule covers both, and a change is
 * announced once, when it is written.
 *
 * The notice goes out once the transaction of the write has committed, and not at all when it rolls
 * back: a change that did not happen is not announced. A write that leaves the address as it was,
 * or changes only its case, tells no one. A notice that cannot be sent is logged: it never fails
 * the change.
 */
export const notifyEmailChangeMiddleware =
  (strapi: Core.Strapi): Modules.Documents.Middleware.Middleware =>
  async (ctx, next) => {
    if (ctx.uid !== USER_UID || ctx.action !== 'update') {
      return next();
    }

    const params = ctx.params as
      { documentId?: string; data?: Record<string, unknown> | null } | undefined;
    const email = params?.data?.email;

    if (!params?.documentId || typeof email !== 'string') {
      return next();
    }

    const { documentId } = params;

    return strapi.db.transaction(async ({ onCommit }: TransactionHooks) => {
      const before = (await strapi.db
        .query(USER_UID)
        .findOne({ where: { documentId }, select: ['email', 'preferredLocale'] })) as {
        email?: unknown;
        preferredLocale?: unknown;
      } | null;
      const result = await next();

      // An update of a user that is not there changes no address
      if (!result || typeof before?.email !== 'string') {
        return result;
      }

      const oldEmail = before.email;
      const newEmail = normalizeEmail(email);

      if (normalizeEmail(oldEmail) !== newEmail) {
        onCommit(() => {
          sendEmailChangedNotice(strapi, {
            oldEmail,
            newEmail,
            preferredLocale: before.preferredLocale,
          }).catch((error: unknown) => {
            strapi.log.warn(
              `end-users: could not send the email-changed notice (${(error as Error)?.message}).`
            );
          });
        });
      }

      return result;
    });
  };
