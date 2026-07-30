'use strict';

// Thin wrapper that calls the unified test runner with type=cli
// Inject --type cli before the rest of the arguments
const args = process.argv.slice(2);
process.argv = [process.argv[0], process.argv[1], '--type', 'cli', ...args];
// eslint-disable-next-line import/extensions
require('./run-tests.js');
