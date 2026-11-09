import type { Core } from '@strapi/types';

import { USER_UID } from '../constants';
import { LEGACY_ORIGIN } from './origin';

/**
 * Signs a user out of their old Users & Permissions sessions, all of them or one device's. Those
 * sessions are core's session manager's, under the `users-permissions` origin and the user's
 * numeric id, so the engine's own revoke never reaches them. Nothing happens while the origin is
 * not defined.
 */
export const revokeLegacySessions = async (
  strapi: Core.Strapi,
  documentId: string,
  deviceId?: string
): Promise<void> => {
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
