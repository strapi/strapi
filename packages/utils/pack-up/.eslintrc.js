module.exports = {
  root: true,
  extends: ['custom/back/typescript'],
  parserOptions: {
    project: ['./tsconfig.eslint.json'],
  },
  overrides: [
    {
      files: ['./scripts/**/*', './src/cli/errors.ts', './src/cli/index.ts'],
      rules: {
        'no-console': ['error', { allow: ['error'] }],
      },
    },
    {
      files: ['./src/node/core/logger.ts'],
      rules: {
        'no-console': 'off',
      },
    },
  ],
  rules: {
    /**
     * Force us to use the Logger instance.
     */
    'no-console': 'error',
    'import/extensions': 'off',
    'import/order': [
      'error',
      {
        groups: [
          ['external', 'internal', 'builtin'],
          'parent',
          ['sibling', 'index'],
          'object',
          'type',
        ],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],
    /**
     * TODO: This should live in the base config.
     */
    'nonblock-statement-body-position': ['error', 'below'],
  },
};
