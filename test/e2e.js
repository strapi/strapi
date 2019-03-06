const fs = require('fs');
const path = require('path');
const { cleanTestApp, generateTestApp, startTestApp } = require('./helpers/testAppGenerator');
const shelljs = require('shelljs');
const execa = require('execa');

const appName = 'testApp';

const databases = {
  mongo: `--dbclient=mongo --dbhost=127.0.0.1 --dbport=27017 --dbname=strapi-test-${new Date().getTime()} --dbusername= --dbpassword=`,
  postgres:
    '--dbclient=postgres --dbhost=127.0.0.1 --dbport=5432 --dbname=strapi_test --dbusername=strapi --dbpassword=strapi',
  mysql:
    '--dbclient=mysql --dbhost=127.0.0.1 --dbport=3306 --dbname=strapi-test --dbusername=root --dbpassword=root',
  sqlite: '--dbclient=sqlite --dbfile=./tmp/data.db',
};

const { runCLI: jest } = require('jest-cli/build/cli');

const test = async () => {
  const child = execa.shell('npm run test:e2e', {
    stdio: 'pipe',
    cwd: path.resolve(__dirname, '..'),
    env: {
      FORCE_COLOR: 1,
    },
  });

  child.stdout.pipe(process.stdout);
  child.stderr.pipe(process.stderr);

  return child;
};

const main = async () => {
  const database = process.argv.length > 2 ? process.argv.slice(2).join(' ') : databases.postgres;

  await cleanTestApp(appName);
  await generateTestApp({ appName, database });

  const { testApp, ready, end } = startTestApp({ appName });

  await ready;

  // stop tests if the testApp stops
  end
    .then(() => {
      process.stdout.write('testApp exited before the end', () => {
        process.exit(1);
      });
    })
    .catch(err => {
      console.log(err);
      process.stdout.write('testApp exited before the end with error', () => {
        process.exit(1);
      });
    });

  await test().catch(() => {});
  process.kill(testApp.pid);
};

main();
