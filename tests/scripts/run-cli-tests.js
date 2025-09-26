'use strict';

const yargs = require('yargs');
const SharedTestRunner = require('./shared-test-runner');
const CLIRunner = require('./runners/cli-runner');

const cliRunner = new CLIRunner();

const testRunner = new SharedTestRunner({
  testType: 'cli',
  runner: cliRunner.run.bind(cliRunner),
});

yargs
  .parserConfiguration({
    /**
     * This lets us pass any other arguments to the test runner
     * e.g. the name of a specific test or the project we want to run
     */
    'unknown-options-as-args': false,
  })
  .command(testRunner.createCommand())
  .command(testRunner.createCleanCommand())
  .help()
  .parse();
