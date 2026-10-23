'use strict';

module.exports = {
  displayName: 'CLI tests',
  testMatch: ['**/?(*.)+(spec|test).cli.(js|ts)'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/../../../../tests/setup/jest-cli.setup.js'],
  coveragePathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/node_modules/',
    '<rootDir>/out-tsc/',
    '<rootDir>/test/',
  ],
  transform: {
    'node_modules[/\\\\](stream-json|stream-chain)[/\\\\].+\\.js$': ['@swc/jest'],
    '^.+\\.ts$': ['@swc/jest'],
  },
  // stream-json 3 and stream-chain 4 are ESM-only. Jest 29 does not native-load them.
  transformIgnorePatterns: ['/node_modules/(?!(stream-json|stream-chain)/)', '\\.pnp\\.[^\\/]+$'],
  modulePathIgnorePatterns: ['[/\\\\]\\.cache[/\\\\]', '[/\\\\]dist[/\\\\]'],
};
