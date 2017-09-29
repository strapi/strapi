#!/usr/bin/env node

'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');

// Local Strapi dependencies.
const packageJSON = require('../package.json');

// Strapi utilities.
const program = require('strapi-utils').commander;

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
  .action(program.versionInformation);

// `$ strapi new`
program
  .command('new')
  .option('-d, --dev', 'Development mode')
  .description('create a new application ')
  .action(require('./strapi-new'));

// `$ strapi start`
program
  .command('start')
  .description('start your Strapi application')
  .action(require('./strapi-start'));

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
