'use strict';

/**
 * Get test app paths from TEST_APPS environment variable
 * This is a simple utility that doesn't import any heavy dependencies,
 * making it safe to use in Jest test files.
 */
const getTestApps = () => {
  return process.env.TEST_APPS.split(',');
};

module.exports = { getTestApps };
