import type { Core, Modules } from '@strapi/types';

import { PLUGIN_ID, USER_UID } from '../constants';
import type { AuthEngine } from '../engine/types';

/** The stored `banned` of a user. */
const readBanned = async (strapi: Core.Strapi, documentId: string): Promise<unknown> => {
  const row = (await strapi.db
    .query(USER_UID)
    .findOne({ where: { documentId }, select: ['banned'] })) as { banned?: unknown } | null;

  return row?.banned;
};

/**
 * `revoke-on-ban`: a user who is banned is signed out everywhere. It is the rule behind every way
 * of setting `banned`: the Content Manager, the admin API, Better Auth's own ban, a script.
 *
 * The sessions go in the same transaction as the ban, so a ban is never in place while the sessions
 * it was meant to end are still there. The Content API strategy refuses a banned user on its own
 * (403, `USER_BANNED`); ending the sessions is what makes the next request a 401 and not a 403, and
 * what stops a cookie that is never used again from outliving the ban.
 *
 * What counts is what was stored, not what was sent: the Document Service casts the value, so a
 * `'true'` or a `1` sent for `banned` is stored as `true` and has to end the sessions as well. Any
 * write that names `banned` therefore runs in a transaction, and once it is written the sessions
 * go when the user it returns is banned (read again from the database when the caller's `fields`
 * left `banned` out). Lifting a ban, or changing anything else about a banned user, ends nothing.
 */
export const revokeOnBanMiddleware =
  (strapi: Core.Strapi): Modules.Documents.Middleware.Middleware =>
  async (ctx, next) => {
    if (ctx.uid !== USER_UID || ctx.action !== 'update') {
      return next();
    }

    const params = ctx.params as
      { documentId?: string; data?: Record<string, unknown> | null } | undefined;

    if (!params?.data || !('banned' in params.data) || !params.documentId) {
      return next();
    }

    const { documentId } = params;
    const engine = strapi.plugin(PLUGIN_ID).service('engine').get() as AuthEngine;

    return strapi.db.transaction(async () => {
      const user = await next();
      const written = user as Record<string, unknown> | null | undefined;

      // An update of a user that is not there bans no one
      if (!written) {
        return user;
      }

      // A caller that asked for some `fields` gets the user back without `banned`: what was stored
      // is read again, in the same transaction
      const banned = 'banned' in written ? written.banned : await readBanned(strapi, documentId);

      // An update that does not leave the user banned ends nothing
      if (banned === true) {
        await engine.revokeSessions(documentId);
      }

      return user;
    });
  };
