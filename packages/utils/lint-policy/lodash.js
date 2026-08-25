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

/**
 * Builds a banned member whose message points at its native replacement.
 *
 * @param {string} name
 * @param {string} replacement
 * @param {string} [note]
 * @returns {{ name: string; message: string }}
 */
const banned = (name, replacement, note) => ({
  name,
  message: `Use ${replacement} instead of lodash \`${name}\`.${note ? ` ${note}` : ''}`,
});

/**
 * Members banned everywhere, with the native replacement to reach for instead.
 *
 * The list is deliberately wider than what the codebase currently imports: a member with an exact
 * native equivalent is banned whether or not it has a call site today, so the next one is caught by
 * the linter rather than by review. Members whose lodash semantics differ from the closest native
 * API are left out on purpose — `assignIn` copies inherited properties, `lowerCase` splits words
 * rather than lowercasing, `min`/`max` return `undefined` for an empty array where `Math.min`/
 * `Math.max` return infinities, and the `isMap`/`isRegExp` family survives cross-realm values that
 * `instanceof` does not.
 */
const BANNED_MEMBERS = [
  // Array
  banned('isArray', '`Array.isArray`', 'lodash re-exports the native function.'),
  banned(
    'forEach',
    '`for...of` or `Array.prototype.forEach`',
    'Iterate `Object.entries`/`Object.values` for objects.'
  ),
  banned(
    'filter',
    '`Array.prototype.filter`',
    'Iterate `Object.entries`/`Object.values` for objects.'
  ),
  banned(
    'find',
    '`Array.prototype.find`',
    'Expand matcher shorthand (`{ id }`) into an explicit predicate.'
  ),
  banned(
    'map',
    '`Array.prototype.map`',
    "Expand iteratee shorthand (`map(xs, 'id')`) into an arrow, and map `Object.values` for objects."
  ),
  banned(
    'reduce',
    '`Array.prototype.reduce`',
    'Reduce `Object.entries` for objects — the iteratee takes `[key, value]` rather than `(value, key)`.'
  ),
  banned('concat', '`Array.prototype.concat` or an array spread'),
  banned('head', '`array[0]` or `Array.prototype.at`'),
  banned('nth', '`Array.prototype.at`'),
  banned('fill', '`Array.prototype.fill`'),
  banned('indexOf', '`Array.prototype.indexOf`'),
  banned('lastIndexOf', '`Array.prototype.lastIndexOf`'),
  banned('findIndex', '`Array.prototype.findIndex`'),
  banned('findLastIndex', '`Array.prototype.findLastIndex`'),
  banned('flattenDeep', '`Array.prototype.flat(Infinity)`'),
  banned(
    'reduceRight',
    '`Array.prototype.reduceRight`',
    'Iterate `Object.entries`/`Object.values` for objects.'
  ),
  banned('toArray', '`Array.from` (or `Object.values` for objects)'),

  // Object
  banned('keys', '`Object.keys`'),
  banned('values', '`Object.values`'),
  banned('entries', '`Object.entries`'),
  banned('toPairs', '`Object.entries`'),
  banned('fromPairs', '`Object.fromEntries`'),

  // String
  banned('endsWith', '`String.prototype.endsWith`'),
  banned('repeat', '`String.prototype.repeat`'),
  banned('padStart', '`String.prototype.padStart`'),
  banned('trimStart', '`String.prototype.trimStart`'),
  banned('parseInt', '`Number.parseInt`'),

  // Number
  banned('isSafeInteger', '`Number.isSafeInteger`'),

  // Math and comparison
  banned('add', 'the `+` operator'),
  banned('subtract', 'the `-` operator'),
  banned('multiply', 'the `*` operator'),
  banned('divide', 'the `/` operator'),
  banned('gt', 'the `>` operator'),
  banned('gte', 'the `>=` operator'),
  banned('lt', 'the `<` operator'),
  banned('lte', 'the `<=` operator'),

  // Function
  banned('now', '`Date.now`'),
  banned('noop', '`() => {}`'),
  banned('stubTrue', '`() => true`'),
  banned('stubFalse', '`() => false`'),
  banned('stubArray', '`() => []`'),
  banned('stubObject', '`() => ({})`'),
  banned('stubString', "`() => ''`"),
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
