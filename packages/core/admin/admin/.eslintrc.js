module.exports = {
  root: true,
  overrides: [
    {
      files: ['**/*.js', '**/*.jsx'],
      extends: ['custom/front'],
      rules: {
        'import/extensions': 'off',
      },
    },
    {
      files: ['**/*.ts', '**/*.tsx'],
      extends: ['custom/front/typescript'],
    },
    {
      files: ['./tests/*', '**/*.test.*'],
      env: {
        jest: true,
      },
      rules: {
        /**
         * So we can do `import { render } from '@tests/utils'`
         */
        'import/no-unresolved': 'off',
      },
    },
  ],
};
