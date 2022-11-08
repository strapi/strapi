'use strict';

process.env.NODE_ENV = 'test';

const yargs = require('yargs');

const { runTestApp } = require('../helpers/test-app');

// eslint-disable-next-line no-unused-expressions
yargs
  .command(
    '$0 [appPath]',
    'Run test app',
    (yarg) => {
      yarg.positional('appPath', {
        type: 'string',
        default: 'test-apps/base',
      });
    },
    (argv) => {
      const { appPath = 'test-apps/base' } = argv;
      runTestApp(appPath);
    }
  )
  .help().argv;
