#!/usr/bin/env node

'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');

// Public dependencies
const _ = require('lodash');

// Master of ceremonies for generators.
const generate = require('strapi-generate');

// Logger.
const logger = require('strapi-utils').logger;

/**
 * `$ strapi generate`
 *
 * Scaffolding for the application in our working directory.
 */

module.exports = function () {
  // Pass the original CLI arguments down to the generator
  // (but first, remove commander's extra argument).
  const cliArguments = Array.prototype.slice.call(arguments);
  cliArguments.pop();

  // Build initial scope.
  const scope = {
    rootPath: process.cwd(),
    strapiRoot: path.resolve(__dirname, '..'),
    args: cliArguments
  };

  const template = _.find(arguments, o => {
    return o.hasOwnProperty('tpl');
  });

  if (template) {
    scope.template = template.tpl;
  }

  // Register the generator type.
  // It can be a controller, model, service, etc.
  scope.generatorType = process.argv[2].split(':')[1];

  // Register the name.
  scope.generatorName = cliArguments[1];

  // Check that we're in a valid Strapi project.
  if (scope.generatorType !== 'new' || scope.generatorType !== 'generator' || scope.generatorType !== 'hook') {
    const pathToPackageJSON = path.resolve(scope.rootPath, 'package.json');
    let invalidPackageJSON;

    try {
      require(pathToPackageJSON);
    } catch (e) {
      invalidPackageJSON = true;
    }

    if (invalidPackageJSON) {
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
        logger.info('Generated a new ' + scope.generatorType + ' `' + scope.humanizeId + '` at ' + scope.humanizedPath + '.');
      }

      process.exit(0);
    }
  });
};
