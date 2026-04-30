module.exports = {
  root: true,
  extends: ['custom/back/typescript'],
  parserOptions: {
    tsconfigRootDir: __dirname,
  },
  overrides: [
    {
      files: ['**/*.test.ts'],
      rules: {
        'import/no-relative-packages': 'warn',
      },
    },
  ],
};
