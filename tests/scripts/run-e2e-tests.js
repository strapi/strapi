'use strict';

// Thin wrapper that calls the unified test runner with type=e2e
// Inject --type e2e before the rest of the arguments
const args = process.argv.slice(2);
process.argv = [process.argv[0], process.argv[1], '--type', 'e2e', ...args];
// eslint-disable-next-line import/extensions
require('./run-tests.js');
