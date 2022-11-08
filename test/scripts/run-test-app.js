'use strict';

process.env.NODE_ENV = 'test';

const path = require('path');
const yargs = require('yargs');
const execa = require('execa');

const main = async (appPath) => {
  const cmdContext = {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '../..', appPath),
    env: {
      // if STRAPI_LICENSE is in the env the test will run in ee automatically
      STRAPI_DISABLE_EE: !process.env.STRAPI_LICENSE,
      FORCE_COLOR: 1,
      JWT_SECRET: 'aSecret',
    },
  };

  try {
    await execa('yarn', ['strapi', 'build'], cmdContext);
    await execa('yarn', ['strapi', 'start'], cmdContext);

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

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
      main(appPath);
    }
  )
  .help().argv;
