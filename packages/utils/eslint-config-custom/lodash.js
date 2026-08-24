// @ts-check

/** @import { Linter } from 'eslint' */

/**
 * Shared lodash policy for the monorepo.
 *
 * Each banned member has a native equivalent, so importing it only costs a module and hides the
 * standard API. The rules below ban every way of reaching one — ESM named imports, deep submodule
 * imports, CommonJS `require`, and namespace member access (`_.isArray`) — because a single
 * `no-restricted-imports` entry misses most of them.
 *
 * Named imports are matched via `no-restricted-syntax` rather than `no-restricted-imports`
 * `importNames`, because the latter also rejects `import * as _ from 'lodash'` outright; the
 * namespace itself is fine, only the member access is not.
 */

/**
 * A single `no-restricted-imports` `paths` entry.
 *
 * @typedef {{ name: string; importNames?: string[]; message?: string }} RestrictedImportPath
 */

/**
 * A single `no-restricted-syntax` entry.
 *
 * @typedef {{ selector: string; message?: string }} RestrictedSyntax
 */

/** Local identifiers conventionally bound to a lodash namespace. */
const LODASH_NAMESPACES = '(_|lodash|fp)';

/** Members banned everywhere, with the native replacement to reach for instead. */
const BANNED_MEMBERS = [
  {
    name: 'isArray',
    message:
      'Use the native `Array.isArray` instead of lodash `isArray` (lodash re-exports the native function).',
  },
  {
    name: 'forEach',
    message:
      'Use native iteration instead of lodash `forEach` — `for...of`, `Array.prototype.forEach`, or `Object.entries`/`Object.values` for objects.',
  },
];

/** `no-restricted-imports` patterns: `import isArray from 'lodash/isArray'`. */
const restrictedImportPatterns = BANNED_MEMBERS.map(({ name, message }) => ({
  group: [`lodash/${name}`, `lodash/fp/${name}`],
  message,
}));

/**
 * `no-restricted-syntax` entries, covering the forms `no-restricted-imports` cannot express.
 *
 * @type {RestrictedSyntax[]}
 */
const restrictedSyntax = BANNED_MEMBERS.flatMap(({ name, message }) => [
  {
    // `import { isArray } from 'lodash'` / `'lodash/fp'`
    selector: `ImportDeclaration[source.value=/^lodash(\\/fp)?$/] > ImportSpecifier[imported.name='${name}']`,
    message,
  },
  {
    // `_.isArray(x)`, `lodash.isArray(x)`, `fp.isArray(x)`
    selector: `MemberExpression[object.name=/^${LODASH_NAMESPACES}$/][property.name='${name}']`,
    message,
  },
  {
    // `const { isArray } = require('lodash')` / `require('lodash/fp')`
    selector: `VariableDeclarator[init.callee.name='require'][init.arguments.0.value=/^lodash(\\/fp)?$/] > ObjectPattern > Property[key.name='${name}']`,
    message,
  },
  {
    // `require('lodash/isArray')`
    selector: `CallExpression[callee.name='require'][arguments.0.value=/^lodash(\\/fp)?\\/${name}$/]`,
    message,
  },
]);

/**
 * Builds the `no-restricted-imports` value, appending the lodash patterns to any package-specific
 * paths.
 *
 * @param {RestrictedImportPath[]} [paths]
 * @returns {Linter.RuleEntry<[{ paths: RestrictedImportPath[]; patterns: typeof restrictedImportPatterns }]>}
 */
const noRestrictedImports = (paths = []) => [
  'error',
  { paths, patterns: restrictedImportPatterns },
];

/**
 * Builds the `no-restricted-syntax` value, appending the lodash selectors to any package-specific
 * ones.
 *
 * @param {RestrictedSyntax[]} [selectors]
 * @returns {Linter.RuleEntry<RestrictedSyntax[]>}
 */
const noRestrictedSyntax = (selectors = []) => ['error', ...selectors, ...restrictedSyntax];

module.exports = { noRestrictedImports, noRestrictedSyntax };
