#!/usr/bin/env node

'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');

// Public node modules.
const winston = require('winston');

// Master of ceremonies for generators.
const generate = require('strapi-generate');

// Local Strapi dependencies.
const packageJSON = require('../package.json');

// Logger.
const logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      level: 'debug',
      colorize: 'level'
    })
  ]
});

/**
 * `$ strapi generate`
 *
 * Scaffolding for the application in our working directory.
 */

module.exports = function () {

  // Pass the original CLI arguments down to the generator
  // (but first, remove commander's extra argument).
  // Also peel off the `generatorType` arg.
  const cliArguments = Array.prototype.slice.call(arguments);
  cliArguments.pop();

  // Build initial scope.
  const scope = {
    rootPath: process.cwd(),
    strapiRoot: path.resolve(__dirname, '..'),
    generatorType: cliArguments.shift(),
    generatorName: process.argv[2],
    args: cliArguments,
    strapiPackageJSON: packageJSON
  };

  // Check that we're in a valid Strapi project.
  if (scope.generatorType !== 'new') {
    const pathToPackageJSON = path.resolve(scope.rootPath, 'package.json');
    let invalidPackageJSON;

    try {
      require(pathToPackageJSON);
    } catch (e) {
      invalidPackageJSON = true;
    }

    if (invalidPackageJSON) {
      return logger.error('This command can only be used inside an Strapi project.');
    }
  }

  // Show usage if no generator type is defined.
  if (!scope.generatorType) {
    return logger.error('Write `$ strapi generate [something]` instead.');
  }

  // Return the scope and the response (`error` or `success`).
  return generate(scope, {

    // Log and exit the REPL in case there is an error
    // while we were trying to generate the requested generator.
    error: function returnError(msg) {
      logger.error(msg);
      process.exit(1);
    },

    // Log and exit the REPL in case of success
    // but first make sure we have all the info we need.
    success: function returnSuccess() {
      if (!scope.outputPath && scope.filename && scope.destDir) {
        scope.outputPath = scope.destDir + scope.filename;
      }

      if (scope.generatorType !== 'new') {
        logger.info('Generated a new ' + scope.generatorType + ' `' + scope.humanizeId + '` at ' + scope.humanizedPath + '.');
      }

      process.exit(0);
    }
  });
};
