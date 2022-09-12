'use strict';

const { isArray, toPath } = require('lodash/fp');

module.exports =
  (allowedFields = null) =>
  ({ key, path }, { remove }) => {
    // All fields are allowed
    if (allowedFields === null) {
      return;
    }

    // Ignore invalid formats
    if (!isArray(allowedFields)) {
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

    // Remove otherwise
    remove(key);
  };

/**
 * Retrieve the list of allowed paths based on the given path
 *
 * @param {string} path
 * @return {string[]}
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
const getContainedPaths = (path) => {
  const parts = toPath(path);

  return parts.reduce((acc, value, index, list) => {
    return [...acc, list.slice(0, index + 1).join('.')];
  }, []);
};
