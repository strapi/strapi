const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:1337',
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/**/*.cy.js',
    video: true,
    screenshotOnRunFailure: true,
    env: {
      adminEmail: 'admin@example.com',
      adminPassword: 'Admin123!',
    },
  },
  viewportWidth: 1280,
  viewportHeight: 720,
});
