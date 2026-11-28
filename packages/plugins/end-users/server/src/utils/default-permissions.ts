import { isOwner } from '../conditions';
import { PROFILE_UID } from '../constants';
import type { PermissionRow } from './permission-row';

/** A route-only permission: the route's scope, no subject, no field rule, no condition */
const routeRow = (action: string): PermissionRow => ({
  action,
  subject: null,
  properties: {},
  conditions: [],
});

/** A permission on the caller's own profile: every field, through `is-owner` on `user` */
export const ownProfileRow = (action: string): PermissionRow => ({
  action: `${PROFILE_UID}.${action}`,
  subject: PROFILE_UID,
  properties: {},
  conditions: [{ name: isOwner.name, params: { field: 'user' } }],
});

/**
 * What the Authenticated role may do when it is created:
 *
 * - the three `me` routes (`controllers/me.ts`), which answer only for the caller, so granting them
 *   leaks nothing;
 * - `find`, `findOne` and `update` on the profile type, with `is-owner` on its `user`: a user reads
 *   and changes their own profile, every field but `user`, which `is-owner` locks. No `create` or
 *   `delete`: the plugin makes and removes profiles with their user.
 *
 * Nothing else: not `/api/users*`, not `user.update`.
 *
 * The profile `update` row is the one written with no field list here; it is seeded with the
 * profile's attributes at first start (`writableProfileFields`) and an existing
 * database keeps the row it has.
 */
export const DEFAULT_AUTHENTICATED_PERMISSIONS: readonly PermissionRow[] = [
  routeRow('plugin::end-users.me.find'),
  routeRow('plugin::end-users.me.findProfile'),
  routeRow('plugin::end-users.me.updateProfile'),
  ownProfileRow('find'),
  ownProfileRow('findOne'),
  ownProfileRow('update'),
];
