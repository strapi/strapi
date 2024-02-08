import { isArray, isNil, isString, toPath } from 'lodash/fp';
import type { Visitor } from '../../traverse/factory';

export default (allowedFields: string[] | null = null): Visitor =>
  ({ key, path: { attribute: path } }, { remove }) => {
    // All fields are allowed
    if (allowedFields === null) {
      return;
    }

    // Throw on invalid formats
    if (!(isArray(allowedFields) && allowedFields.every(isString))) {
      throw new TypeError(
        `Expected array of strings for allowedFields but got "${typeof allowedFields}"`
      );
    }

    if (isNil(path)) {
      return;
    }

    const containedPaths = getContainedPaths(path);

    /**
     * Tells if the current path should be kept or not based
     * on the success of the check functions for any of the allowed paths.
     *
     * The check functions are defined as follow:
     *
     * `containedPaths.includes(p)`
     * @example
     * ```js
     * const path = 'foo.bar.field';
     * const p = 'foo.bar';
     * // it should match
     *
     * const path = 'foo.bar.field';
     * const p = 'bar.foo';
     * // it shouldn't match
     *
     * const path = 'foo.bar';
     * const p = 'foo.bar.field';
     * // it should match but isn't handled by this check
     * ```
     *
     * `p.startsWith(`${path}.`)`
     * @example
     * ```js
     * const path = 'foo.bar';
     * const p = 'foo.bar.field';
     * // it should match
     *
     * const path = 'foo.bar.field';
     * const p = 'bar.foo';
     * // it shouldn't match
     *
     * const path = 'foo.bar.field';
     * const p = 'foo.bar';
     * // it should match but isn't handled by this check
     * ```
     */
    const isPathAllowed = allowedFields.some(
      (p) => containedPaths.includes(p) || p.startsWith(`${path}.`)
    );

    if (isPathAllowed) {
      return;
    }

    // TODO: Please, make ID a regular attribute
    // Handle nested IDs, allow them only if some part of the parent is allowed too. This is
    // particularly important for content-manager's sanitizeOutput calls, where we want to keep
    // the IDs but the RBAC permissions are not granular enough to include them
    //
    // In the best of worlds, this shouldn't be the responsibility of this utility, but as long as ID
    // isn't considered as an attribute, we're making an exception to avoid handling this everywhere.
    //
    // /!\ This can cause issues when IDs shouldn't be present (e.g. sanitizing inputs).
    //     For the moment, this should be handled separately. For more information,
    //     see packages/core/admin/server/src/services/permission/permissions-manager/sanitize.ts#createSanitizeInput()
    if (containedPaths.length > 1 && key === 'id') {
      // This is computed, but it should always evaluate to false
      // since the same check is done in isPathAllowed definition
      const isParentPathAllowed = allowedFields.some((field) => containedPaths.includes(field));

      // Check if any sibling (using containedPath) is allowed (present in allowedFields)
      const hasAllowedSiblings = allowedFields.some((field) =>
        containedPaths.some((part) => field.startsWith(`${part}.`))
      );

      // If one of the condition is met, then we can consider keeping the ID field
      if (isParentPathAllowed || hasAllowedSiblings) {
        return;
      }
    }

    // Remove otherwise
    remove(key);
  };

/**
 * Retrieve the list of allowed paths based on the given path
 *
 * @example
 * ```js
 * const containedPaths = getContainedPaths('foo');
 * // ['foo']
 *
 *  * const containedPaths = getContainedPaths('foo.bar');
 * // ['foo', 'foo.bar']
 *
 *  * const containedPaths = getContainedPaths('foo.bar.field');
 * // ['foo', 'foo.bar', 'foo.bar.field']
 * ```
 */
const getContainedPaths = (path: string) => {
  const parts = toPath(path);

  return parts.reduce((acc, value, index, list) => {
    return [...acc, list.slice(0, index + 1).join('.')];
  }, [] as string[]);
};
