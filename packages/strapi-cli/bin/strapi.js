#!/usr/bin/env node

'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');

// Local Strapi dependencies.
const program = require('strapi-utils').commander;
const packageJSON = require('../package.json');

// Needed.
const NOOP = function () {};
let cmd;

/**
 * Normalize version argument
 *
 * `$ strapi -v`
 * `$ strapi -V`
 * `$ strapi --version`
 * `$ strapi version`
 */

// Expose version.
program.version(packageJSON.version, '-v, --version');

// Make `-v` option case-insensitive.
process.argv = _.map(process.argv, function (arg) {
  return (arg === '-V') ? '-v' : arg;
});

// `$ strapi version` (--version synonym)
cmd = program.command('version');
cmd.description('output your version of Strapi');
cmd.action(program.versionInformation);

// `$ strapi new <name>`
cmd = program.command('new');
cmd.unknownOption = NOOP;
cmd.description('create a new application ');
cmd.action(require('./strapi-new'));

// `$ strapi start`
cmd = program.command('start');
cmd.unknownOption = NOOP;
cmd.description('start your Strapi application');
cmd.action(require('./strapi-start'));

// `$ strapi generate <generatorName>`
cmd = program.command('generate');
cmd.unknownOption = NOOP;
cmd.description('generate templates from a generator');
cmd.action(require('./strapi-generate'));

// `$ strapi console`
cmd = program.command('console');
cmd.unknownOption = NOOP;
cmd.description('open the Strapi framework console');
cmd.action(require('./strapi-console'));

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
