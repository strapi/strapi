import type { Core } from '@strapi/types';

import { PLUGIN_ID, USER_UID } from '../constants';
import type abilityService from '../services/ability';
import type roleService from '../services/role';
import type { CompatConfig } from './config';
import { toUpUser } from './shapes';
import type { UpUser, UpUserSource } from './shapes';
import { loadUserExtras } from './user-extras';

/**
 * The answer of a sign-in, sign-up or reset, in the shape users-permissions answered with. `jwt` is
 * the engine's session token: it works as a Bearer token on the Content API, and it is not a JWT.
 */
export const loginBody = (
  _cfg: CompatConfig,
  input: { token: string; user: UpUser; cookie: boolean }
): { jwt: string; user: UpUser } => ({ jwt: input.token, user: input.user });

/**
 * The signed-in user as users-permissions shows them, with no role: the profile fields the user's
 * own roles let them read, and the numeric `id` next to the `documentId`.
 */
export const signedInUser = async (
  strapi: Core.Strapi,
  documentId: string
): Promise<UpUser | null> => {
  const user = (await strapi.db.query(USER_UID).findOne({ where: { documentId } })) as
    (UpUserSource & { documentId: string }) | null;

  if (!user) {
    return null;
  }

  const plugin = strapi.plugin(PLUGIN_ID);
  const held = await (plugin.service('role') as ReturnType<typeof roleService>).getForUser(
    documentId
  );
  const ability = await (plugin.service('ability') as ReturnType<typeof abilityService>).forUser(
    user,
    held
  );
  const auth = { credentials: { id: user.id, documentId }, ability };
  const extras = await loadUserExtras(strapi, auth, [user]);

  return toUpUser(user, { extras: extras.get(documentId) });
};
