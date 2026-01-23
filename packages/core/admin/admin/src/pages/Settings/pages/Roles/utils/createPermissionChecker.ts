/**
 * Utility functions for creating permission checkers used in bulk update operations.
 * These functions encapsulate the logic for validating whether a user has permission
 * to modify specific fields/actions during role and app token editing.
 */

import { Permission as AuthPermission } from '../../../../../features/Auth';

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
    // Find matching permission for this action + subject
    const matchingPerm = userPermissions.find(
      (perm) => perm.action === actionId && perm.subject === subject
    );

    if (matchingPerm === undefined) {
      return false;
    }

    // Check if path contains field information
    // Path structure: ['properties', 'fields', 'fieldName'] or ['properties', 'fields', 'parent', 'child']
    const fieldsIndex = path.indexOf('fields');

    if (fieldsIndex === -1 || fieldsIndex >= path.length - 1) {
      // Not a field path, allow if action+subject match
      return true;
    }

    // Extract field path after 'fields'
    const fieldPath = path.slice(fieldsIndex + 1).join('.');
    const fields = matchingPerm.properties?.fields;

    // If fields is null/undefined, allow all fields
    if (fields === null || fields === undefined) {
      return true;
    }

    // If empty array, deny all fields
    if (Array.isArray(fields) && fields.length === 0) {
      return false;
    }

    // Check if field is in allowed list (supports nested paths)
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
    // Determine actionId: either from parent context or from path[0]
    let currentActionId = actionIdFromContext;
    let adjustedPath = path;

    // If actionId is undefined, we're at content type level
    // First element of path will be the actionId
    if (currentActionId === undefined && path.length > 0) {
      // Check if path[0] looks like an action (contains dots)
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

    // Determine if this is a field-level path
    const fieldsIndex = adjustedPath.indexOf('fields');

    if (fieldsIndex !== -1 && fieldsIndex < adjustedPath.length - 1) {
      // We have a field path after 'fields'
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

    // Not a field path, allow if action+subject match
    return true;
  };
};
