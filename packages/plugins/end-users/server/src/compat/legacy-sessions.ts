import type { Core } from '@strapi/types';

import { USER_UID } from '../constants';
import { LEGACY_ORIGIN } from './origin';

/**
 * Signs a user out of their old Users & Permissions sessions, all of them or one device's. Those
 * sessions are core's session manager's, under the `users-permissions` origin and the user's
 * numeric id, so the engine's own revoke never reaches them.
 *
 * Revoking all of them also records the moment on the user (`legacyTokensRevokedAt`), which ends
 * the tokens that belong to no session: an old `{ id }` token is signed and has nothing to revoke,
 * so one issued at or before that moment is refused instead (`resolveLegacyUserId`). That is done
 * whether or not the old origin is defined: such a token does not need it. A device's revoke leaves
 * the user's other devices, and so the moment, alone.
 */
export const revokeLegacySessions = async (
  strapi: Core.Strapi,
  documentId: string,
  deviceId?: string
): Promise<void> => {
  if (deviceId === undefined) {
    await strapi.db
      .query(USER_UID)
      .updateMany({ where: { documentId }, data: { legacyTokensRevokedAt: new Date() } });
  }

  if (!strapi.sessionManager.hasOrigin(LEGACY_ORIGIN)) {
    return;
  }

  const user = (await strapi.db
    .query(USER_UID)
    .findOne({ where: { documentId }, select: ['id'] })) as { id?: number } | null;

  if (user?.id !== undefined) {
    await strapi.sessionManager(LEGACY_ORIGIN).invalidateRefreshToken(String(user.id), deviceId);
  }
};
