module.exports = {
  root: true,
  extends: ['custom/back/typescript'],
  parserOptions: {
    project: ['./tsconfig.eslint.json'],
  },
  rules: {
    'no-console': ['error', { allow: ['warn', 'error', 'info'] }],
  },
};
