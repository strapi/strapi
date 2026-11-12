/**
 * Edge case, kept on purpose to test type generation: a JS policy whose config is typed with JSDoc.
 * `allowJs` (tsconfig.json) compiles it into `dist`, which registers `global::has-scope`, and type
 * generation reads its config from the JSDoc of the handler: `{ scope: string }`. Without `allowJs`
 * or a sibling `has-scope.d.ts`, the policy would register `unknown`.
 *
 * @param {unknown} policyContext
 * @param {{ scope: string }} config
 */
module.exports = (policyContext, config) => typeof config.scope === 'string';
