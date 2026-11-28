'use strict';

process.env.NODE_ENV = 'test';

const { cleanTestApp, generateTestApp, runTestApp } = require('../helpers/test-app');
const { createGenerateArgsParser, resolveDatabaseConfig } = require('./database-config');

const main = async (database, appPath, opts) => {
  try {
    await cleanTestApp(appPath);
    await generateTestApp({ appPath, database, template: opts.template });

    if (opts.run) {
      await runTestApp(appPath);
    }
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

if (require.main === module) {
  const argv = createGenerateArgsParser(process.argv.slice(2), { exitProcess: true }).parse();
  const { run, appPath = 'test-apps/base', template } = argv;

  main(resolveDatabaseConfig(argv), appPath, { run, template });
}
