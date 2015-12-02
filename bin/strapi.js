#!/usr/bin/env node

'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');

// Local Strapi dependencies.
const program = require('./_commander');
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
cmd.option('-d, --dry', 'naked Strapi application');

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

// `$ strapi link`
cmd = program.command('link');
cmd.unknownOption = NOOP;
cmd.description('link an existing application to the Strapi Studio');
cmd.action(require('./strapi-link'));

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

// `$ strapi login`
cmd = program.command('login');
cmd.unknownOption = NOOP;
cmd.description('connect your account to the Strapi Studio');
cmd.action(require('./strapi-login'));

// `$ strapi logout`
cmd = program.command('logout');
cmd.unknownOption = NOOP;
cmd.description('logout your account from the Strapi Studio');
cmd.action(require('./strapi-logout'));

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
