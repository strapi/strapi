#!/usr/bin/env node
'use strict';

const _ = require('lodash');
const resolveCwd = require('resolve-cwd');
const { yellow } = require('chalk');

const program = require('strapi-utils').commander;
const packageJSON = require('../package.json');

const checkCwdIsStrapiApp = name => {
  let logErrorAndExit = () => {
    console.log(
      `You need to run ${yellow(
        `strapi ${name}`
      )} in a Strapi project. Make sure you are in the right directory`
    );
    process.exit(1);
  };

  try {
    const pkgJSON = require(process.cwd() + '/package.json');
    if (!_.has(pkgJSON, 'dependencies.strapi')) {
      logErrorAndExit(name);
    }
  } catch (err) {
    logErrorAndExit(name);
  }
};

const getLocalScript = name => (...args) => {
  checkCwdIsStrapiApp(name);

  const cmdPath = resolveCwd.silent(`strapi/lib/commands/${name}`);
  if (!cmdPath) {
    console.log(
      `Error loading the local ${yellow(
        name
      )} command. Strapi might not be installed in your "node_modules". You may need to run "npm install"`
    );
    process.exit(1);
  }

  return require(cmdPath)(...args);
};

/**
 * Normalize version argument
 *
 * `$ strapi -v`
 * `$ strapi -V`
 * `$ strapi --version`
 * `$ strapi version`
 */

program.allowUnknownOption(true);

// Expose version.
program.version(packageJSON.version, '-v, --version');

// Make `-v` option case-insensitive.
process.argv = _.map(process.argv, arg => {
  return arg === '-V' ? '-v' : arg;
});

// `$ strapi version` (--version synonym)
program
  .command('version')
  .description('output your version of Strapi')
  .action(() => {
    console.log(packageJSON.version);
  });

// `$ strapi console`
program
  .command('console')
  .description('open the Strapi framework console')
  .action(getLocalScript('console'));

// `$ strapi new`
program
  .command('new [name]')
  .option('--debug', 'Display database connection error')
  .option('--quickstart', 'Quickstart app creation')
  .option('--dbclient <dbclient>', 'Database client')
  .option('--dbhost <dbhost>', 'Database host')
  .option('--dbsrv <dbsrv>', 'Database srv')
  .option('--dbport <dbport>', 'Database port')
  .option('--dbname <dbname>', 'Database name')
  .option('--dbusername <dbusername>', 'Database username')
  .option('--dbpassword <dbpassword>', 'Database password')
  .option('--dbssl <dbssl>', 'Database SSL')
  .option('--dbauth <dbauth>', 'Authentication Database')
  .option('--dbfile <dbfile>', 'Database file path for sqlite')
  .option('--dbforce', 'Overwrite database content if any')
  .description('create a new application')
  .action(require('../lib/commands/new'));

// `$ strapi start`
program
  .command('start')
  .description('Start your Strapi application')
  .action(getLocalScript('start'));

// `$ strapi develop`
program
  .command('develop')
  .alias('dev')
  .option('--no-build', 'Disable build', false)
  .description('Start your Strapi application in development mode')
  .action(getLocalScript('develop'));

// `$ strapi generate:api`
program
  .command('generate:api <id> [attributes...]')
  .option('-t, --tpl <template>', 'template name')
  .option('-a, --api <api>', 'API name to generate a sub API')
  .option('-p, --plugin <plugin>', 'plugin name to generate a sub API')
  .description('generate a basic API')
  .action((id, attributes, cliArguments) => {
    cliArguments.attributes = attributes;
    getLocalScript('generate')(id, cliArguments);
  });

// `$ strapi generate:controller`
program
  .command('generate:controller <id>')
  .option('-a, --api <api>', 'API name to generate a sub API')
  .option('-p, --plugin <api>', 'plugin name')
  .option('-t, --tpl <template>', 'template name')
  .description('generate a controller for an API')
  .action(getLocalScript('generate'));

// `$ strapi generate:model`
program
  .command('generate:model <id> [attributes...]')
  .option('-a, --api <api>', 'API name to generate a sub API')
  .option('-p, --plugin <api>', 'plugin name')
  .option('-t, --tpl <template>', 'template name')
  .description('generate a model for an API')
  .action((id, attributes, cliArguments) => {
    cliArguments.attributes = attributes;
    getLocalScript('generate')(id, cliArguments);
  });

// `$ strapi generate:policy`
program
  .command('generate:policy <id>')
  .option('-a, --api <api>', 'API name')
  .option('-p, --plugin <api>', 'plugin name')
  .description('generate a policy for an API')
  .action(getLocalScript('generate'));

// `$ strapi generate:service`
program
  .command('generate:service <id>')
  .option('-a, --api <api>', 'API name')
  .option('-p, --plugin <api>', 'plugin name')
  .option('-t, --tpl <template>', 'template name')
  .description('generate a service for an API')
  .action(getLocalScript('generate'));

// `$ strapi generate:plugin`
program
  .command('generate:plugin <id>')
  .option('-n, --name <name>', 'Plugin name')
  .description('generate a basic plugin')
  .action(getLocalScript('generate'));

program
  .command('build')
  .description('Builds the strapi admin app')
  .action(getLocalScript('build'));

// `$ strapi install`
program
  .command('install [plugins...]')
  .description('install a Strapi plugin')
  .action(getLocalScript('install'));

// `$ strapi uninstall`
program
  .command('uninstall [plugins...]')
  .description('uninstall a Strapi plugin')
  .option('-d, --delete-files', 'Delete files', false)
  .action(getLocalScript('uninstall'));

/**
 * Normalize help argument
 */

// `$ strapi help` (--help synonym)
program
  .command('help')
  .description('output the help')
  .action(program.usageMinusWildcard);

// `$ strapi <unrecognized_cmd>`
// Mask the '*' in `help`.
program.command('*').action(program.usageMinusWildcard);

// Don't balk at unknown options.

/**
 * `$ strapi`
 */

program.parse(process.argv);
const NO_COMMAND_SPECIFIED = program.args.length === 0;
if (NO_COMMAND_SPECIFIED) {
  program.usageMinusWildcard();
}
