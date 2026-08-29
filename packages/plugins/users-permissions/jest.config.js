'use strict';

module.exports = {
  preset: '../../../jest-preset.unit.js',
  displayName: 'Users & Permissions plugin',
  // Restrict coverage to server only. Admin uses TSX; when this target runs in CI (unit_back),
  // coverage is collected from the whole package and the instrumenter fails parsing .tsx.
  collectCoverageFrom: [
    '<rootDir>/server/**/*.ts',
    '!**/__tests__/**',
    '!**/*.test.ts',
    '!**/node_modules/**',
    '!**/dist/**',
  ],
};
