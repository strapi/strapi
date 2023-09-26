module.exports = {
  root: true,
  extends: ['custom/back/typescript'],
  overrides: [
    {
      files: ['**/*.test.ts'],
      rules: {
        'import/no-relative-packages': 'warn',
      },
    },
  ],
};
