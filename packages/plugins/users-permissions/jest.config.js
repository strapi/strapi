'use strict';

module.exports = {
  preset: '../../../jest-preset.unit.js',
  displayName: 'Users & Permissions plugin',
  // Restrict coverage to server only. Admin uses JSX; when this target runs in CI (unit_back),
  // coverage is collected from the whole package and the instrumenter fails parsing .jsx.
  collectCoverageFrom: [
    '<rootDir>/server/**/*.{js,ts}',
    '!**/__tests__/**',
    '!**/*.test.{js,ts}',
    '!**/node_modules/**',
    '!**/dist/**',
  ],
};
