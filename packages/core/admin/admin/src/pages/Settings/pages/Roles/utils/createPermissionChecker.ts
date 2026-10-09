/**
 * Utility functions for creating permission checkers used in bulk update operations.
 * These functions encapsulate the logic for validating whether a user has permission
 * to modify specific fields/actions during role and app token editing.
 *
 * The rules mirror the server ceiling (`server/src/domain/permission/ceiling.ts`): the
 * permissions matching an action and subject are combined, one with `fields: []` grants nothing,
 * and every property (`fields`, `locales`, ...) is restricted to the union of the held values.
 */

import type { Permission as AuthPermission } from '../../../../../features/Auth';

const hasNoFields = (permission: AuthPermission): boolean => {
  const fields = permission.properties?.fields;

  return Array.isArray(fields) && fields.length === 0;
};

/**
 * Whether the user holds `action` on `subject` and, when given, the `value` of `property`
 * (e.g. the `title` field or the `fr` locale).
 */
export const isPermissionHeld = (
  userPermissions: AuthPermission[],
  action: string,
  subject: string | null | undefined,
  property?: string,
  value?: string
): boolean => {
  const matchingPermissions = userPermissions.filter(
    (perm) =>
      perm.action === action && (perm.subject ?? null) === (subject ?? null) && !hasNoFields(perm)
  );

  if (matchingPermissions.length === 0) {
    return false;
  }

  if (property === undefined || value === undefined || value === '') {
    return true;
  }

  const heldValues = matchingPermissions.map((perm) => perm.properties?.[property]);

  // A permission that does not restrict the property covers every value
  if (heldValues.some((values) => values === undefined || values === null)) {
    return true;
  }

  return heldValues
    .flatMap((values) => (Array.isArray(values) ? (values as string[]) : []))
    .some(
      (allowed) => value === allowed || (property === 'fields' && value.startsWith(`${allowed}.`))
    );
};

/**
 * Checks a path of the permissions form (e.g. `['properties', 'locales', 'fr']` or
 * `['properties', 'fields', 'seo', 'title']`, or relative to `properties` like
 * `['fields', 'title']`) against the user permissions.
 */
const isPathHeld = (
  userPermissions: AuthPermission[],
  action: string,
  subject: string | null | undefined,
  path: string[]
): boolean => {
  const propertiesIndex = path.indexOf('properties');
  const propertyIndex = propertiesIndex === -1 ? path.indexOf('fields') : propertiesIndex + 1;

  if (propertyIndex === -1 || propertyIndex >= path.length - 1) {
    return isPermissionHeld(userPermissions, action, subject);
  }

  const property = path[propertyIndex];
  const value = path.slice(propertyIndex + 1).join('.');

  return isPermissionHeld(userPermissions, action, subject, property, value);
};

/**
 * Creates a permission checker function for property-level permission validation.
 * Used in bulk update operations to filter which leaves can be modified.
 *
 * @param actionId - The action to check (e.g., 'plugin::content-manager.explorer.create')
 * @param subject - The subject to check (e.g., 'api::article.article'), or null for plugins/settings
 * @param userPermissions - Array of user permissions, or undefined for Role editing mode
 * @returns A checker function that validates if a given path should be allowed,
 *          or undefined if in Role editing mode (no restrictions)
 */
export const createFieldPermissionChecker = (
  actionId: string,
  subject: string | null,
  userPermissions: AuthPermission[] | undefined
): ((path: string[]) => boolean) | undefined => {
  if (userPermissions === undefined) {
    return undefined;
  }

  return (path: string[]) => isPathHeld(userPermissions, actionId, subject, path);
};

/**
 * Creates a permission checker for content type operations where the action ID
 * may need to be extracted from the path itself (for content type name checkboxes).
 *
 * @param subject - The subject to check
 * @param actionIdFromContext - The action ID from parent context (may be undefined)
 * @param userPermissions - Array of user permissions, or undefined for Role editing mode
 * @returns A checker function or undefined if in Role editing mode
 */
export const createDynamicActionPermissionChecker = (
  subject: string | null | undefined,
  actionIdFromContext: string | undefined,
  userPermissions: AuthPermission[] | undefined
): ((path: string[]) => boolean) | undefined => {
  if (userPermissions === undefined || subject === undefined) {
    return undefined;
  }

  return (path: string[]) => {
    let currentActionId = actionIdFromContext;
    let adjustedPath = path;

    if (currentActionId === undefined && path.length > 0) {
      if (path[0].includes('plugin::') || path[0].includes('admin::')) {
        currentActionId = path[0];
        adjustedPath = path.slice(1);
      }
    }

    if (currentActionId === undefined) {
      return false;
    }

    return isPathHeld(userPermissions, currentActionId, subject, adjustedPath);
  };
};
