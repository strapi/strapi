'use strict';

const yargs = require('yargs');
const SharedTestRunner = require('./shared-test-runner');
const E2ERunner = require('./runners/e2e-runner');

const e2eRunner = new E2ERunner();

const testRunner = new SharedTestRunner({
  testType: 'e2e',
  runner: e2eRunner.run.bind(e2eRunner),
});

yargs
  .parserConfiguration({
    /**
     * When unknown options is false, using -- to separate playwright args from test:e2e args works
     * When it is true, the script gets confused about additional arguments, with or without using -- to separate commands
     */
    'unknown-options-as-args': false,
  })
  .command(testRunner.createCommand())
  .command(testRunner.createCleanCommand())
  .help()
  .parse();
