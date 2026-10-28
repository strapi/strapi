'use strict';

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const execa = require('execa');
const yargs = require('yargs');

process.env.NODE_ENV = 'test';

const appPath = 'test-apps/api';
process.env.ENV_PATH = path.resolve(__dirname, '../..', appPath, '.env');

const { cleanTestApp, generateTestApp } = require('../helpers/test-app');

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
      database: 'strapi_test',
      username: 'strapi',
      password: 'strapi',
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

const jestCmd = 'jest --config jest.config.api.js --forceExit'.split(' ');

const workerAppPath = (id) => `${appPath}-worker-${id}`;

/**
 * Gives each Jest worker its own copy of the test app. The builders write schema files into the
 * app, and SQLite keeps its database in a file inside it, so two workers cannot share one.
 * tests/setup/jest-api.setup.js points each worker at its copy.
 */
const prepareWorkerApps = (workers) => {
  const source = path.resolve(__dirname, '../..', appPath);

  for (let id = 1; id <= workers; id += 1) {
    const target = path.resolve(__dirname, '../..', workerAppPath(id));

    fs.rmSync(target, { recursive: true, force: true });
    // Leave the database file behind, so every worker starts from an empty database.
    fs.cpSync(source, target, {
      recursive: true,
      filter: (file) => path.relative(source, file) !== 'tmp',
    });

    // Jest's haste map rejects two packages with the same name.
    const packageJsonPath = path.join(target, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    packageJson.name = `${packageJson.name}-worker-${id}`;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  }
};

/**
 * The database client the generated app connects to. `--database` can't tell: with
 * `--no-generate-app` it keeps its sqlite default whatever the app was generated for. The app
 * reads DATABASE_CLIENT from the environment first, then from its .env.
 */
const appDatabaseClient = () => {
  if (process.env.DATABASE_CLIENT) {
    return process.env.DATABASE_CLIENT;
  }

  if (!fs.existsSync(process.env.ENV_PATH)) {
    return undefined;
  }

  return dotenv.parse(fs.readFileSync(process.env.ENV_PATH)).DATABASE_CLIENT;
};

const runAllTests = async (args, { workers }) => {
  // Required for Jest: code run under Jest (including app code loaded by tests) can execute in a context
  // where Node treats dynamic import() as VM-bound; supported Node versions require this flag.
  // ESM-only deps (e.g. file-type in upload) use dynamic import(); without the flag we get
  // ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG. Other dynamic imports (plop, prettier) run in the
  // main process (CLI/scripts) or browser (admin), so they never hit this.
  const nodeOptions = [process.env.NODE_OPTIONS, '--experimental-vm-modules']
    .filter(Boolean)
    .join(' ');

  const parallelism = workers > 1 ? [`--maxWorkers=${workers}`] : ['--runInBand'];

  return execa('yarn', [...jestCmd, ...parallelism, ...args], {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '../..'),
    env: {
      API_TESTS_WORKER_APPS: workers > 1 ? path.resolve(__dirname, '../..', appPath) : '',
      STRAPI_DISABLE_EE: !process.env.STRAPI_LICENSE,
      FORCE_COLOR: 1,
      ENV_PATH: process.env.ENV_PATH,
      JWT_SECRET: 'aSecret',
      STRAPI_GRAPHQL_V4_COMPATIBILITY_MODE: 'true',
      NODE_OPTIONS: nodeOptions,
    },
  });
};

const main = async ({ database, generateApp, workers }, args) => {
  try {
    if (generateApp) {
      await cleanTestApp(appPath);
      await generateTestApp({ appPath, database });
    }

    if (workers > 1) {
      const client = appDatabaseClient();

      if (client !== 'sqlite') {
        const found = client ? `uses ${client}` : 'has no DATABASE_CLIENT';
        throw new Error(
          `--workers needs a SQLite test app, and ${appPath} ${found}. On Postgres or MySQL the workers would share one database.`
        );
      }

      prepareWorkerApps(workers);
    }

    await runAllTests(args, { workers }).catch(() => {
      process.exit(1);
    });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

yargs
  .parserConfiguration({
    'unknown-options-as-args': true,
  })
  .command(
    '$0',
    'run API integration tests',
    (yarg) => {
      yarg.option('database', {
        alias: 'db',
        describe: 'choose a database',
        choices: Object.keys(databases),
        default: 'sqlite',
      });

      yarg.boolean('generate-app');

      yarg.option('workers', {
        describe: 'run the test files in this many Jest workers, each with its own app copy',
        type: 'number',
        default: 1,
      });
    },
    (argv) => {
      const { database, generateApp = true, workers } = argv;

      main({ generateApp, database: databases[database], workers }, argv._);
    }
  )
  .help()
  .parse();
