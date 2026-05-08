/**
 * Utility functions for creating permission checkers used in bulk update operations.
 * These functions encapsulate the logic for validating whether a user has permission
 * to modify specific fields/actions during role and app token editing.
 */

import type { Permission as AuthPermission } from '../../../../../features/Auth';

/**
 * Creates a permission checker function for field-level permission validation.
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

  return (path: string[]) => {
    const matchingPerm = userPermissions.find(
      (perm) => perm.action === actionId && perm.subject === subject
    );

    if (matchingPerm === undefined) {
      return false;
    }

    const fieldsIndex = path.indexOf('fields');

    if (fieldsIndex === -1 || fieldsIndex >= path.length - 1) {
      return true;
    }

    const fieldPath = path.slice(fieldsIndex + 1).join('.');
    const fields = matchingPerm.properties?.fields;

    if (fields === null || fields === undefined) {
      return true;
    }

    if (Array.isArray(fields) && fields.length === 0) {
      return false;
    }

    if (Array.isArray(fields)) {
      return fields.some(
        (allowedField) => fieldPath === allowedField || fieldPath.startsWith(`${allowedField}.`)
      );
    }

    return false;
  };
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

    const matchingPerm = userPermissions.find(
      (perm) => perm.action === currentActionId && perm.subject === subject
    );

    if (matchingPerm === undefined) {
      return false;
    }

    const fieldsIndex = adjustedPath.indexOf('fields');

    if (fieldsIndex !== -1 && fieldsIndex < adjustedPath.length - 1) {
      const fieldPath = adjustedPath.slice(fieldsIndex + 1).join('.');
      const fields = matchingPerm.properties?.fields;

      if (fields === null || fields === undefined) {
        return true;
      }

      if (Array.isArray(fields) && fields.length === 0) {
        return false;
      }

      return (
        Array.isArray(fields) &&
        fields.some((f) => fieldPath === f || fieldPath.startsWith(`${f}.`))
      );
    }

    return true;
  };
};
