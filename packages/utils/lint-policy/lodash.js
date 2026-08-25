// @ts-check

/**
 * Shared lodash policy, consumed by both linters.
 *
 * ESLint (`eslint-config-custom`) and OxLint (`oxlint-config`) enforce the same bans, and both
 * accept the same `[severity, ...options]` rule-value shape, so the two builders below are used
 * verbatim by each. Only the rule *key* differs: OxLint has no native `no-restricted-syntax` and
 * takes it from `oxlint-plugin-eslint` under the `eslint-js/` prefix.
 *
 * Each banned member has a native equivalent, so importing it only costs a module and hides the
 * standard API. Every way of reaching one is covered — ESM named imports, deep submodule imports,
 * CommonJS `require`, and namespace member access (`_.isArray`) — because a single
 * `no-restricted-imports` entry misses most of them.
 *
 * Named imports are matched via `no-restricted-syntax` rather than `no-restricted-imports`
 * `importNames`, because the latter also rejects `import * as _ from 'lodash'` outright in both
 * linters; the namespace binding itself is fine, only the member access is not.
 */

/**
 * A single `no-restricted-imports` `paths` entry.
 *
 * @typedef {{ name: string; importNames?: string[]; message?: string }} RestrictedImportPath
 */

/**
 * A single `no-restricted-imports` `patterns` entry.
 *
 * @typedef {{ group: string[]; message?: string }} RestrictedImportPattern
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
  {
    name: 'keys',
    message: 'Use the native `Object.keys` instead of lodash `keys`.',
  },
  {
    name: 'values',
    message: 'Use the native `Object.values` instead of lodash `values`.',
  },
  {
    name: 'entries',
    message: 'Use the native `Object.entries` instead of lodash `entries`.',
  },
  {
    name: 'concat',
    message:
      'Use the native `Array.prototype.concat` or an array spread instead of lodash `concat`.',
  },
  {
    name: 'filter',
    message:
      'Use the native `Array.prototype.filter` instead of lodash `filter` (iterate `Object.entries`/`Object.values` for objects).',
  },
  {
    name: 'find',
    message:
      'Use the native `Array.prototype.find` instead of lodash `find` — expand matcher shorthand (`{ id }`) into an explicit predicate.',
  },
];

/**
 * `no-restricted-imports` patterns: `import isArray from 'lodash/isArray'`.
 *
 * @type {RestrictedImportPattern[]}
 */
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
 * Builds the `no-restricted-imports` value, appending the lodash patterns to any consumer-specific
 * paths.
 *
 * The concrete tuple return type matters: ESLint's `Linter.RuleEntry` makes the options element
 * optional, which OxLint's stricter `no-restricted-imports` type rejects.
 *
 * @param {RestrictedImportPath[]} [paths]
 * @returns {['error', { paths: RestrictedImportPath[]; patterns: RestrictedImportPattern[] }]}
 */
const noRestrictedImports = (paths = []) => [
  'error',
  { paths, patterns: restrictedImportPatterns },
];

/**
 * Builds the `no-restricted-syntax` value, appending the lodash selectors to any
 * consumer-specific ones.
 *
 * @param {RestrictedSyntax[]} [selectors]
 * @returns {['error', ...RestrictedSyntax[]]}
 */
const noRestrictedSyntax = (selectors = []) => ['error', ...selectors, ...restrictedSyntax];

module.exports = { noRestrictedImports, noRestrictedSyntax };
