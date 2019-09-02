#!/usr/bin/env node

'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');

// Master of ceremonies for generators.
const generate = require('strapi-generate');

// Logger.
const { cli, logger } = require('strapi-utils');

// Local Strapi dependencies.
const packageJSON = require('../../package.json');


/**
 * `$ strapi generate`
 *
 * Scaffolding for the application in our working directory.
 */

module.exports = function (id, cliArguments) {
  // Build initial scope.
  const scope = {
    rootPath: process.cwd(),
    strapiRoot: path.resolve(__dirname, '..'),
    id: id,
    args: cliArguments,
    strapiPackageJSON: packageJSON
  };

  // Register the generator type.
  // It can be a controller, model, service, etc.
  scope.generatorType = process.argv[2].split(':')[1];

  // Check that we're in a valid Strapi project.
  if (scope.generatorType !== 'new' || scope.generatorType !== 'generator' || scope.generatorType !== 'hook') {
    if (!cli.isStrapiApp()) {
      return logger.error('This command can only be used inside a Strapi project.');
    }
  }

  // Show usage if no generator type is defined.
  if (!scope.generatorType) {
    return logger.error('Write `$ strapi generate:something` instead.');
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
        logger.info('Generated a new ' + scope.generatorType + ' `' + scope.humanizeId + '` at ' + scope.humanizedPath + '.'); // eslint-disable-line prefer-template
      }

      process.exit(0);
    }
  });
};
