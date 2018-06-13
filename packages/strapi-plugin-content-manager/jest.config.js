module.exports = {
  name: 'content-manager',
  displayName: 'Content Manager',
  testMatch: ['test/?(*.)+(test).js'],
  coveragePathIgnorePatterns: [
    '<rootDir>/admin/',
    '<rootDir>/dist/',
    '<rootDir>/node_modules/',
    '<rootDir>/out-tsc/',
    '<rootDir>/test/'
  ]
};
