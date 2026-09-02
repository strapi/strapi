// @ts-check

/**
 * Shared lodash policy, consumed by both linters.
 *
 * ESLint (`eslint-config-custom`) and OxLint (`oxlint-config`) enforce the same bans, and both
 * accept the same `[severity, ...options]` rule-value shape, so each spreads these arrays into its
 * own rule value. Only the rule *key* differs: OxLint has no native `no-restricted-syntax` and
 * takes it from `oxlint-plugin-eslint` under the `eslint-js/` prefix.
 *
 * Both exports are `readonly`: a consumer prepending its own entries must spread rather than
 * mutate, so one config cannot alter what the others enforce. OxLint's `no-restricted-imports`
 * type wants a mutable `patterns`, which the spread at each call site already produces.
 *
 * Each banned member has a native equivalent, so importing it only costs a module and hides the
 * standard API. The forms present in this repository are covered — ESM named imports, deep
 * submodule imports, CommonJS `require`, and static member access on a namespace bound to `_`,
 * `lodash` or `fp` — because a single `no-restricted-imports` entry misses most of them.
 *
 * Deliberately *not* covered, none of which occur here: a default import bound to any other name
 * (`import l from 'lodash'; l.isArray(x)`), member access straight off a require
 * (`require('lodash').isArray(x)`), computed access (`_['isArray']`), and every `lodash-es`
 * form (not a dependency of this repository).
 *
 * Named imports are matched via `no-restricted-syntax` rather than `no-restricted-imports`
 * `importNames`, because the latter also rejects `import * as _ from 'lodash'` outright in both
 * linters; the namespace binding itself is fine, only the member access is not.
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

/** Local identifiers conventionally bound to a lodash namespace; any other binding is not matched. */
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

/**
 * `no-restricted-imports` patterns: `import isArray from 'lodash/isArray'`.
 *
 * @type {readonly RestrictedImportPattern[]}
 */
const restrictedImportPatterns = BANNED_MEMBERS.map(({ name, message }) => ({
  group: [`lodash/${name}`, `lodash/fp/${name}`],
  message,
}));

/**
 * `no-restricted-syntax` entries, covering the forms `no-restricted-imports` cannot express.
 *
 * @type {readonly RestrictedSyntax[]}
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

module.exports = {
  lodashImportPatterns: restrictedImportPatterns,
  lodashSelectors: restrictedSyntax,
};
