module.exports = {
  name: 'setup',
  displayName: 'Setup',
  testPathIgnorePatterns: [
    '<rootDir>/packages/',
  ],
  coveragePathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/node_modules/',
    '<rootDir>/out-tsc/',
    '<rootDir>/test/'
  ]
};
