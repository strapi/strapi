'use strict';

const path = require('path');
const execa = require('execa');
const yargs = require('yargs');

process.env.NODE_ENV = 'test';

const main = async () => {
  try {
    execa('yarn', ['start'], {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '../..'),
      env: {
        // if STRAPI_LICENSE is in the env the test will run in ee automatically
        STRAPI_DISABLE_EE: !process.env.STRAPI_LICENSE,
        FORCE_COLOR: 1,
        ENV_PATH: process.env.ENV_PATH,
        JWT_SECRET: 'aSecret',
      },
    });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

yargs
  .command(
    '$0',
    'Run E2E tests',
    (yarg) => {},
    (argv) => {
      main();
    }
  )
  .help()
  .parse();
