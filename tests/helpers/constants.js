'use strict';

/**
 * Common test constants
 */
const TEST_CONSTANTS = {
  // Default ports
  DEFAULT_PORT: 1337,
  E2E_BASE_PORT: 8000,
  CLI_BASE_PORT: 9000,

  // Timeouts (in milliseconds)
  DEFAULT_TIMEOUT: 30000,
  SERVER_START_TIMEOUT: 160000, // 160 seconds
  HEALTH_CHECK_INTERVAL: 1000,

  // Test app configuration
  DEFAULT_DATABASE: {
    client: 'sqlite',
    connection: {
      filename: './.tmp/data.db',
    },
    useNullAsDefault: true,
  },

  // Environment variables
  ENV_VARS: {
    STRAPI_DISABLE_EE: 'STRAPI_DISABLE_EE',
    STRAPI_LICENSE: 'STRAPI_LICENSE',
    JWT_SECRET: 'JWT_SECRET',
    PORT: 'PORT',
    HOST: 'HOST',
    TEST_APP_PATH: 'TEST_APP_PATH',
    TEST_APPS: 'TEST_APPS',
  },

  // Git configuration
  GIT_USER: {
    name: 'Strapi CLI',
    email: 'test@strapi.io',
  },

  // File patterns
  FILE_PATTERNS: {
    ENV_FILE: '.env',
    PACKAGE_JSON: 'package.json',
    YARN_LOCK: 'yarn.lock',
    PLAYWRIGHT_CONFIG: 'playwright.config.js',
  },

  // Test types
  TEST_TYPES: {
    E2E: 'e2e',
    CLI: 'cli',
    API: 'api',
  },
};

module.exports = TEST_CONSTANTS;
