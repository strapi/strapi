import type { Context } from 'koa';

import type { AdminApiToken } from '../../../../shared/contracts/admin-token';
import type { AdminUser } from '../../../../shared/contracts/shared';
import type { CeilingPermission } from '../../domain/permission/ceiling';
import adminTokenStrategy from '../../strategies/admin-token';
import constants from '../constants';
import { getService } from '../../utils';
import { toEnforcedCeilingPermissions } from './enforced-permissions';

/**
 * Who grants permissions, which decides the permissions they can grant: an admin user grants up
 * to their own permissions (all of them for a super admin), an admin token up to the token's
 * permissions and, unless its owner is a super admin, up to the owner's current permissions.
 */
export type CeilingRequester =
  { user: AdminUser } | { tokenPermissions: CeilingPermission[]; owner: AdminUser };

/**
 * The part of `ctx.state.auth` (set by the auth service) used to tell an admin token request
 * from an admin user one.
 */
interface RequestAuth {
  strategy?: { name?: string };
  credentials?: Partial<Pick<AdminApiToken, 'id' | 'adminPermissions'>> | null;
}

/**
 * The admin token a request was made with, `null` for a request made by an admin user (whose
 * session sets `ctx.state.user` only). When it is not `null`, `ctx.state.user` is the token owner.
 */
export const getCallingAdminToken = (
  ctx: Context
): Partial<Pick<AdminApiToken, 'id' | 'adminPermissions'>> | null => {
  const auth: RequestAuth | undefined = ctx.state.auth;

  if (auth?.strategy?.name !== adminTokenStrategy.name) {
    return null;
  }

  return auth.credentials ?? {};
};

/**
 * The permissions of the admin token a request was made with, `undefined` for a request made by
 * an admin user. An empty list is a token that holds nothing, not a missing token.
 */
export const getCallingTokenPermissions = (ctx: Context): CeilingPermission[] | undefined => {
  const token = getCallingAdminToken(ctx);

  return token === null ? undefined : (token.adminPermissions ?? []);
};

/**
 * A request made with an admin token can only grant what both the token and its owner (in
 * `ctx.state.user`) hold: the token may hold fewer permissions than its owner, and a token
 * written before the owner lost a permission may hold more. A super-admin owner is limited by
 * the token only.
 */
export const getCeilingRequester = (ctx: Context): CeilingRequester => {
  const tokenPermissions = getCallingTokenPermissions(ctx);

  if (tokenPermissions !== undefined) {
    return { tokenPermissions, owner: ctx.state.user };
  }

  return { user: ctx.state.user };
};

const isSuperAdmin = (user: AdminUser): boolean =>
  (user?.roles ?? []).some((role) => role?.code === constants.SUPER_ADMIN_CODE);

/**
 * The permission sets a granted permission must stay within, all of them, as the engine
 * enforces them. A requester with a token gets the token's first. Empty when the requester is
 * not limited (a super admin).
 */
export const findRequesterCeilings = async (
  requester: CeilingRequester
): Promise<CeilingPermission[][]> => {
  if ('tokenPermissions' in requester) {
    const tokenPermissions = await toEnforcedCeilingPermissions(requester.tokenPermissions);

    // A token can carry permissions its owner lost since it was written
    if (isSuperAdmin(requester.owner)) {
      return [tokenPermissions];
    }

    const ownerPermissions = await getService('permission').findUserPermissions(requester.owner);

    return [tokenPermissions, await toEnforcedCeilingPermissions(ownerPermissions)];
  }

  if (isSuperAdmin(requester.user)) {
    return [];
  }

  const userPermissions = await getService('permission').findUserPermissions(requester.user);

  return [await toEnforcedCeilingPermissions(userPermissions)];
};
