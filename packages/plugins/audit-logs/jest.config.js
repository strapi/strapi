module.exports = {
  preset: '../../jest-preset.unit.js',
  displayName: 'Audit Logs plugin',
  roots: ['<rootDir>/server/src/', '<rootDir>/admin/src/'],
  testMatch: ['**/__tests__/**/*.test.{js,ts}'],
  transform: {
    '^.+\\.(t|j)sx?$': [
      '@swc/jest',
      {
        jsc: {
          parser: { syntax: 'typescript', tsx: true, decorators: true },
          transform: { react: { runtime: 'automatic' } },
        },
      },
    ],
  },
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};