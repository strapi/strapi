'use strict';

const path = require('path');

// `run-api-tests.js --workers` gives every Jest worker its own copy of the test app, because
// the builders write schema files into the app and SQLite keeps its database inside it.
if (process.env.API_TESTS_WORKER_APPS) {
  process.env.ENV_PATH = path.join(
    `${process.env.API_TESTS_WORKER_APPS}-worker-${process.env.JEST_WORKER_ID}`,
    '.env'
  );
}

const isoDateRegex = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/;

jest.setTimeout(60000);

expect.extend({
  stringOrNull(received) {
    const pass = typeof received === 'string' || received === null;
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be null or a string`,
      pass,
    };
  },
  toBeISODate(received) {
    const pass = isoDateRegex.test(received) && new Date(received).toISOString() === received;
    return {
      pass,
      message: () => `Expected ${received} ${pass ? 'not ' : ''}to be a valid ISO date string`,
    };
  },
});
