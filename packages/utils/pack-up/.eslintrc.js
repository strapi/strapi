module.exports = {
  root: true,
  extends: ['custom/back/typescript'],
  parserOptions: {
    project: ['./tsconfig.eslint.json'],
  },
  rules: {
    'no-console': ['error', { allow: ['warn', 'error', 'info'] }],
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
  },
};
