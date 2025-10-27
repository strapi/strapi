module.exports = {
  preset: '../../jest-preset.front.js',
  displayName: 'Audit Logs plugin front',
  roots: ['<rootDir>/admin/src/'],
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.front.js'],
};