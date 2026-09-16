// @ts-check

const backJavaScript = [
  'constructor-super',
  'for-direction',
  'getter-return',
  'import/default',
  'import/namespace',
  'no-async-promise-executor',
  'no-caller',
  'no-class-assign',
  'no-compare-neg-zero',
  'no-const-assign',
  'no-constant-condition',
  'no-control-regex',
  'no-debugger',
  'no-delete-var',
  'no-dupe-class-members',
  'no-dupe-else-if',
  'no-dupe-keys',
  'no-duplicate-case',
  'no-empty-character-class',
  'no-empty-pattern',
  'no-eval',
  'no-ex-assign',
  'no-extra-boolean-cast',
  'no-func-assign',
  'no-global-assign',
  'no-import-assign',
  'no-invalid-regexp',
  'no-irregular-whitespace',
  'no-iterator',
  'no-loss-of-precision',
  'no-misleading-character-class',
  'no-nonoctal-decimal-escape',
  'no-obj-calls',
  'no-self-assign',
  'no-setter-return',
  'no-shadow-restricted-names',
  'no-sparse-arrays',
  'no-this-before-super',
  'no-unreachable',
  'no-unsafe-finally',
  'no-unsafe-negation',
  'no-unused-expressions',
  'no-unused-labels',
  'no-unused-vars',
  'no-useless-backreference',
  'no-useless-catch',
  'no-useless-escape',
  'no-useless-rename',
  'no-with',
  'require-yield',
  'use-isnan',
];

const frontJavaScript = [
  ...backJavaScript,
  'react/jsx-no-constructed-context-values',
  'react/jsx-no-undef',
  'react/no-array-index-key',
  'react/no-children-prop',
  'react/no-danger-with-children',
  'react/no-find-dom-node',
  'react/no-is-mounted',
  'react/no-render-return-value',
  'react/no-string-refs',
  'react/no-this-in-sfc',
  'react/no-will-update-set-state',
  'react/void-dom-elements-no-children',
];

const backTypeScript = [
  '@typescript-eslint/no-duplicate-enum-values',
  '@typescript-eslint/no-extra-non-null-assertion',
  '@typescript-eslint/no-misused-new',
  '@typescript-eslint/no-non-null-asserted-optional-chain',
  '@typescript-eslint/no-this-alias',
  '@typescript-eslint/no-unsafe-declaration-merging',
  '@typescript-eslint/prefer-as-const',
  '@typescript-eslint/triple-slash-reference',
  'for-direction',
  'import/default',
  'no-async-promise-executor',
  'no-caller',
  'no-class-assign',
  'no-compare-neg-zero',
  'no-constant-condition',
  'no-control-regex',
  'no-debugger',
  'no-delete-var',
  'no-dupe-else-if',
  'no-duplicate-case',
  'no-empty-character-class',
  'no-empty-pattern',
  'no-eval',
  'no-ex-assign',
  'no-extra-boolean-cast',
  'no-global-assign',
  'no-invalid-regexp',
  'no-irregular-whitespace',
  'no-iterator',
  'no-misleading-character-class',
  'no-nonoctal-decimal-escape',
  'no-self-assign',
  'no-shadow-restricted-names',
  'no-sparse-arrays',
  'no-unsafe-finally',
  'no-unused-labels',
  'no-useless-backreference',
  'no-useless-catch',
  'no-useless-escape',
  'no-useless-rename',
  'no-with',
  'require-yield',
  'use-isnan',
];

const frontTypeScript = [
  '@typescript-eslint/no-duplicate-enum-values',
  '@typescript-eslint/no-extra-non-null-assertion',
  '@typescript-eslint/no-misused-new',
  '@typescript-eslint/no-non-null-asserted-optional-chain',
  '@typescript-eslint/no-this-alias',
  '@typescript-eslint/no-unsafe-declaration-merging',
  '@typescript-eslint/prefer-as-const',
  '@typescript-eslint/triple-slash-reference',
  'import/default',
  'import/namespace',
  'react/jsx-key',
  'react/jsx-no-duplicate-props',
  'react/jsx-no-undef',
  'react/no-children-prop',
  'react/no-danger-with-children',
  'react/no-direct-mutation-state',
  'react/no-find-dom-node',
  'react/no-is-mounted',
  'react/no-render-return-value',
  'react/no-string-refs',
];

/**
 * Disables ESLint rules owned by the root OxLint pass.
 *
 * The environment gate keeps direct package lint, lint:fix, and lint-staged authoritative.
 *
 * @param {readonly string[]} rules
 * @param {string[]} [excludedFiles]
 */
const createOxlintOverride = (rules, excludedFiles) => {
  if (process.env.ESLINT_SKIP_OXLINT_RULES !== 'true') {
    return [];
  }

  /** @type {Record<string, 'off'>} */
  const disabledRules = Object.fromEntries(rules.map((rule) => [rule, 'off']));

  return [
    {
      files: ['**/*'],
      ...(excludedFiles === undefined ? {} : { excludedFiles }),
      rules: disabledRules,
    },
  ];
};

module.exports = {
  backJavaScript,
  backTypeScript,
  createOxlintOverride,
  frontJavaScript,
  frontTypeScript,
};
