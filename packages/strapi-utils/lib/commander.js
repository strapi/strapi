'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');
const program = require('commander');

/**
 * Monkey-patch commander
 */

// Allow us to display `help()`, but omit the wildcard (`*`) command.
program.Command.prototype.usageMinusWildcard = program.usageMinusWildcard = () => {
  program.commands = _.reject(program.commands, {
    _name: '*'
  });
  program.help();
};

module.exports = program;
