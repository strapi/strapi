module.exports = {
  rootDir: __dirname,
  setupFilesAfterEnv: ['<rootDir>/test/unit.setup.js'],
  modulePathIgnorePatterns: ['.cache'],
  testMatch: ['/**/__tests__/**/*.[jt]s?(x)'],
};
