module.exports = {
  root: true,
  extends: ['custom/back/typescript'],
  parserOptions: {
    project: ['./server/tsconfig.eslint.json'],
  },
};
