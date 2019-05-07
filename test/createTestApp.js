const { cleanTestApp, generateTestApp } = require('./helpers/testAppGenerator');
const yargs = require('yargs');

const appName = 'testApp';

const databases = {
  mongo: `--dbclient=mongo --dbhost=127.0.0.1 --dbport=27017 --dbname=strapi-test-${new Date().getTime()} --dbusername=root --dbpassword=strapi`,
  postgres:
    '--dbclient=postgres --dbhost=127.0.0.1 --dbport=5432 --dbname=strapi_test --dbusername=strapi --dbpassword=strapi',
  mysql:
    '--dbclient=mysql --dbhost=127.0.0.1 --dbport=3306 --dbname=strapi-test --dbusername=root --dbpassword=root',
  sqlite: '--dbclient=sqlite --dbfile=./tmp/data.db',
};

const main = async database => {
  try {
    await cleanTestApp(appName);
    await generateTestApp({ appName, database });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

yargs
  .command(
    '$0 [databaseName]',
    'Create test app',
    yargs => {
      yargs.positional('databaseName', {
        choices: Object.keys(databases),
      });
    },
    ({ databaseName }) => {
      if (databaseName) {
        return main(databases[databaseName]);
      }

      return main(process.argv.slice(2).join(' '));
    }
  )
  .help().argv;
