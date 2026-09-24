'use strict';

const { cloneDeep } = require('lodash/fp');

const PUBLIC_ROLE_FILTER = { role: { type: 'public' } };
const PUBLIC_ROLE_CACHE_KEY = 'public';
const ROLE_PERMISSIONS_CACHE_TTL = 60 * 1000;

module.exports = ({ strapi }) => {
  const rolePermissionsCache = new Map();

  // Incremented on every invalidation so that a lookup started before a permission change
  // can't write its outdated result back into the cache once it resolves
  let rolePermissionsCacheGeneration = 0;

  /**
   * Resolve permissions through the cache (60 seconds TTL).
   * A cache miss falls through to the database. A failing database lookup rejects
   * (the request is denied) and is never cached.
   */
  const findCached = async (key, findPermissions) => {
    const cached = rolePermissionsCache.get(key);

    if (cached && cached.expiresAt > Date.now()) {
      return cloneDeep(cached.permissions);
    }

    rolePermissionsCache.delete(key);

    const generation = rolePermissionsCacheGeneration;
    const permissions = await findPermissions();

    if (generation === rolePermissionsCacheGeneration) {
      rolePermissionsCache.set(key, {
        permissions: cloneDeep(permissions),
        expiresAt: Date.now() + ROLE_PERMISSIONS_CACHE_TTL,
      });
    }

    return permissions;
  };

  return {
    /**
     * Find permissions associated to a specific role ID
     *
     * @param {number} roleID
     *
     * @return {object[]}
     */
    async findRolePermissions(roleID) {
      return findCached(`role:${roleID}`, () =>
        strapi.db.query('plugin::users-permissions.role').load({ id: roleID }, 'permissions')
      );
    },

    /**
     * Find permissions for the public role
     *
     * @return {object[]}
     */
    async findPublicPermissions() {
      return findCached(PUBLIC_ROLE_CACHE_KEY, () =>
        strapi.db.query('plugin::users-permissions.permission').findMany({
          where: PUBLIC_ROLE_FILTER,
        })
      );
    },

    /**
     * Invalidate every cached role permission set
     */
    clearRolePermissionsCache() {
      rolePermissionsCache.clear();
      rolePermissionsCacheGeneration += 1;
    },

    /**
     * Transform a Users-Permissions' action into a content API one
     *
     * @param {object} permission
     * @param {string} permission.action
     *
     * @return {{ action: string }}
     */
    toContentAPIPermission(permission) {
      const { action } = permission;

      return { action };
    },
  };
};
