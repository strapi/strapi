#!/usr/bin/env node

'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');

// Strapi utilities.
const program = require('strapi-utils').commander;

// Local Strapi dependencies.
const packageJSON = require('../package.json');

/* eslint-disable no-console */

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
  return (arg === '-V') ? '-v' : arg;
});

// `$ strapi version` (--version synonym)
program
  .command('version')
  .description('output your version of Strapi')
  .action(() => { console.log(packageJSON.version); });


// `$ strapi console`
program
  .command('console')
  .description('open the Strapi framework console')
  .action(require('./strapi-console'));

// `$ strapi new`
program
  .command('new')
  .option('-d, --dev', 'Development mode')
  .option('--dbclient <dbclient>', 'Database client')
  .option('--dbhost <dbhost>', 'Database host')
  .option('--dbport <dbport>', 'Database port')
  .option('--dbname <dbname>', 'Database name')
  .option('--dbusername <dbusername>', 'Database username')
  .option('--dbpassword <dbpassword>', 'Database password')
  .option('--dbssl <dbssl>', 'Database SSL')
  .option('--dbauth <dbauth>', 'Authentication Database')
  .option('--dbforce', 'Overwrite database content if any')
  .description('create a new application')
  .action(require('./strapi-new'));

// `$ strapi start`
program
  .command('start [appPath]')
  .description('start your Strapi application')
  .action((appPath) => {
    require('./strapi-start')(appPath);
  });

// `$ strapi generate:api`
program
  .command('generate:api <id> [attributes...]')
  .option('-t, --tpl <template>', 'template name')
  .option('-a, --api <api>', 'API name to generate a sub API')
  .option('-p, --plugin <plugin>', 'plugin name to generate a sub API')
  .description('generate a basic API')
  .action((id, attributes, cliArguments) => {
    cliArguments.attributes = attributes;
    require('./strapi-generate')(id, cliArguments);
  });

// `$ strapi generate:controller`
program
  .command('generate:controller <id>')
  .option('-a, --api <api>', 'API name to generate a sub API')
  .option('-p, --plugin <api>', 'plugin name')
  .option('-t, --tpl <template>', 'template name')
  .description('generate a controller for an API')
  .action(require('./strapi-generate'));

// `$ strapi generate:model`
program
  .command('generate:model <id> [attributes...]')
  .option('-a, --api <api>', 'API name to generate a sub API')
  .option('-p, --plugin <api>', 'plugin name')
  .option('-t, --tpl <template>', 'template name')
  .description('generate a model for an API')
  .action((id, attributes, cliArguments) => {
    cliArguments.attributes = attributes;
    require('./strapi-generate')(id, cliArguments);
  });

// `$ strapi generate:policy`
program
  .command('generate:policy <id>')
  .option('-a, --api <api>', 'API name')
  .option('-p, --plugin <api>', 'plugin name')
  .description('generate a policy for an API')
  .action(require('./strapi-generate'));

// `$ strapi generate:service`
program
  .command('generate:service <id>')
  .option('-a, --api <api>', 'API name')
  .option('-p, --plugin <api>', 'plugin name')
  .option('-t, --tpl <template>', 'template name')
  .description('generate a service for an API')
  .action(require('./strapi-generate'));

// `$ strapi generate:plugin`
program
  .command('generate:plugin <id>')
  .option('-n, --name <name>', 'Plugin name')
  .description('generate a basic plugin')
  .action(require('./strapi-generate'));

// `$ strapi install`
program
  .command('install <plugin>')
  .option('-d, --dev', 'Development mode')
  .description('install a Strapi plugin')
  .action(require('./strapi-install'));

// `$ strapi uninstall`
program
  .command('uninstall <plugin>')
  .description('uninstall a Strapi plugin')
  .action(require('./strapi-uninstall'));

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
program
  .command('*')
  .action(program.usageMinusWildcard);

// Don't balk at unknown options.

/**
 * `$ strapi`
 */

program.parse(process.argv);
const NO_COMMAND_SPECIFIED = program.args.length === 0;
if (NO_COMMAND_SPECIFIED) {
  program.usageMinusWildcard();
}
