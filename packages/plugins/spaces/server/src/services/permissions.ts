import type { Core } from '@strapi/types';

import { PLUGIN_ID } from '../../../shared/constants';

/**
 * The actions Spaces adds to the permission system. They govern the space
 * *registry* — who may create spaces and decide who belongs to them — not what
 * anyone may do inside one, which is what ordinary Strapi roles already answer.
 */
const adminActions = [
  {
    uid: 'spaces.read',
    displayName: 'Read',
    pluginName: PLUGIN_ID,
    section: 'settings',
    category: 'spaces',
    subCategory: 'general',
  },
  {
    uid: 'spaces.manage',
    displayName: 'Create and edit',
    pluginName: PLUGIN_ID,
    section: 'settings',
    category: 'spaces',
    subCategory: 'general',
  },
  {
    uid: 'members.manage',
    displayName: 'Manage members',
    pluginName: PLUGIN_ID,
    section: 'settings',
    category: 'spaces',
    subCategory: 'general',
  },
  {
    uid: 'spaces.access-all',
    displayName: 'Work across every space',
    pluginName: PLUGIN_ID,
    section: 'settings',
    category: 'spaces',
    subCategory: 'general',
  },
];

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async registerActions() {
    await strapi.service('admin::permission').actionProvider.registerMany(adminActions);
  },

  /**
   * Makes role assignments space-aware.
   *
   * Strapi decides what a user may do from the roles they hold. With Spaces,
   * which roles they hold can depend on where they are: a membership may name
   * the roles that apply inside its space, so that being a publisher for one
   * brand does not make you one for another.
   *
   * A membership that names no role leaves the user with the roles they hold
   * platform-wide, which is both the simpler setup and the one that behaves
   * exactly like Strapi without Spaces.
   */
  installRoleScope() {
    return strapi.service('admin::permission').setUserRolesScope(async (user: { id: number }) => {
      const ctx = strapi.requestContext?.get?.();

      // No request: the CLI, a migration, or permission bookkeeping at boot.
      // Such callers are not standing in any space, so every role applies.
      if (!ctx) {
        return null;
      }

      // This runs while the caller's ability is still being built, which is
      // before authentication has put them on the request — hence passing the
      // user in. The answer is memoised on the request, so settling the scope
      // afterwards costs nothing.
      const { scope, canAccessAll } = await strapi
        .service('plugin::spaces.access')
        .resolve(ctx, user);

      // Someone who may work across every space is not governed by membership.
      // They still land in a space by default — choosing one has to be
      // deliberate — and narrowing them to the roles of a membership they do
      // not have would leave them with no permissions at all, including the
      // permission to create the first space.
      if (canAccessAll) {
        return null;
      }

      // Outside a space, every role the user holds applies. Which rows they
      // then reach is the query scope's business, not the ability's.
      if (scope.mode !== 'space') {
        return null;
      }

      return strapi.service('plugin::spaces.membership').getEffectiveRoleIds(user.id, scope.id);
    });
  },
});

export { adminActions };
