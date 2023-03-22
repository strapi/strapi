#!/usr/bin/env node

'use strict';

process.env.NODE_ENV = 'test';

const fs = require('fs');
const path = require('path');
const execa = require('execa');
const { cleanTestApp, generateTestApp } = require('../../../test/helpers/test-app-generator');

const appName = 'testApp';

const databases = {
  postgres: {
    client: 'postgres',
    connection: {
      host: '127.0.0.1',
      port: 5432,
      database: 'strapi_test',
      username: 'strapi',
      password: 'strapi',
      schema: 'myschema',
    },
  },
  mysql: {
    client: 'mysql',
    connection: {
      host: '127.0.0.1',
      port: 3306,
      database: 'strapi-test',
      username: 'root',
      password: 'root',
    },
  },
  sqlite: {
    client: 'sqlite',
    connection: {
      filename: './tmp/data.db',
    },
    useNullAsDefault: true,
  },
};

const jestCmd = 'jest --config jest.config.api.js --runInBand --forceExit'.split(' ');

const runAllTests = async (env) => {};

async function main() {
  const appDir = await fs.promises.mkdtemp(path.join(__dirname, '../../../test-apps/'));

  await generateTestApp({ appName: appDir, database: databases.sqlite });

  // accept an array of plugins to install
  const args = process.argv.slice(2);

  await execa('yarn', [...jestCmd, ...args], {
    stdio: 'inherit',
    // cwd: process,
    env: {
      // if STRAPI_LICENSE is in the env the test will run in ee automatically
      STRAPI_DISABLE_EE: !process.env.STRAPI_LICENSE,
      FORCE_COLOR: 1,
      ENV_PATH: process.env.ENV_PATH,
      JWT_SECRET: 'aSecret',
      ENV_PATH: path.join(appDir, '.env'),
      TEST_APP_DIR: appDir,
    },
  });

  await cleanTestApp(appDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
