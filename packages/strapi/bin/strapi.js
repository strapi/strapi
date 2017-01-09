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

// Needed.
const NOOP = () => {};
let cmd;

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
cmd = program.command('version');
cmd.description('output your version of Strapi');
cmd.action(program.versionInformation);

// `$ strapi new`
cmd = program.command('new');
cmd.unknownOption = NOOP;
cmd.description('create a new application ');
cmd.action(require('./strapi-new'));

// `$ strapi start`
cmd = program.command('start');
cmd.unknownOption = NOOP;
cmd.description('start your Strapi application');
cmd.action(require('./strapi-start'));

// `$ strapi console`
// cmd = program.command('console');
// cmd.unknownOption = NOOP;
// cmd.description('open the Strapi framework console');
// cmd.action(require('./strapi-console'));

// `$ strapi generate:api`
cmd = program.command('generate:api');
cmd.unknownOption = true;
cmd.option('-t, --tpl <template>', 'template name');
cmd.description('generate a basic API');
cmd.action(require('./strapi-generate'));

// `$ strapi generate:controller`
cmd = program.command('generate:controller');
cmd.unknownOption = NOOP;
cmd.option('-t, --tpl <template>', 'template name');
cmd.description('generate a controller for an API');
cmd.action(require('./strapi-generate'));

// `$ strapi generate:model`
cmd = program.command('generate:model');
cmd.unknownOption = NOOP;
cmd.option('-t, --tpl <template>', 'template name');
cmd.description('generate a model for an API');
cmd.action(require('./strapi-generate'));

// `$ strapi generate:policy`
cmd = program.command('generate:policy');
cmd.unknownOption = NOOP;
cmd.description('generate a policy for an API');
cmd.action(require('./strapi-generate'));

// `$ strapi generate:service`
cmd = program.command('generate:service');
cmd.unknownOption = NOOP;
cmd.option('-t, --tpl <template>', 'template name');
cmd.description('generate a service for an API');
cmd.action(require('./strapi-generate'));

// `$ strapi generate:hook`
cmd = program.command('generate:hook');
cmd.unknownOption = NOOP;
cmd.description('generate an installable hook');
cmd.action(require('./strapi-generate'));

// `$ strapi generate:generator`
cmd = program.command('generate:generator');
cmd.unknownOption = NOOP;
cmd.description('generate a custom generator');
cmd.action(require('./strapi-generate'));

// `$ strapi migrate:make`
cmd = program.command('migrate:make');
cmd.unknownOption = NOOP;
cmd.description('make migrations for a connection');
cmd.action(require('./strapi-migrate-make'));

// `$ strapi migrate:run`
cmd = program.command('migrate:run');
cmd.unknownOption = NOOP;
cmd.description('run migrations for a connection');
cmd.action(require('./strapi-migrate-run'));

// `$ strapi migrate:rollback`
cmd = program.command('migrate:rollback');
cmd.unknownOption = NOOP;
cmd.description('rollback the latest batch of migrations for a connection');
cmd.action(require('./strapi-migrate-rollback'));

// `$ strapi config`
cmd = program.command('config');
cmd.unknownOption = NOOP;
cmd.description('extend the Strapi framework with custom generators');
cmd.action(require('./strapi-config'));

// `$ strapi update`
cmd = program.command('update');
cmd.unknownOption = NOOP;
cmd.description('pull the latest updates of your custom generators');
cmd.action(require('./strapi-update'));

/**
 * Normalize help argument
 */

// `$ strapi help` (--help synonym)
cmd = program.command('help');
cmd.description('output the help');
cmd.action(program.usageMinusWildcard);

// `$ strapi <unrecognized_cmd>`
// Mask the '*' in `help`.
cmd = program.command('*');
cmd.action(program.usageMinusWildcard);

// Don't balk at unknown options.
program.unknownOption = NOOP;

/**
 * `$ strapi`
 */

program.parse(process.argv);
const NO_COMMAND_SPECIFIED = program.args.length === 0;
if (NO_COMMAND_SPECIFIED) {
  program.usageMinusWildcard();
}
