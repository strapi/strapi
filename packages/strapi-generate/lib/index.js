'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const reportback = require('reportback')();

// Logger.
const logger = require('strapi-utils').logger;

// Local dependencies.
const generate = require('./generate');

/* eslint-disable prefer-template */
/**
 * Generate module(s)
 *
 * @param {Object} scope
 * @param {Function} cb
 *
 * @return {[Type]}
 */

module.exports = (scope, cb) => {
  cb = cb || {};
  cb = reportback.extend(cb, {
    error: cb.error,
    success: () => {},
    notStrapiApp: () => {},
    alreadyExists: () => {
      return cb.error();
    }
  });

  // Use configured module name for this `generatorType` if applicable.
  const module = 'strapi-generate-' + scope.generatorType;
  let generator;

  function throwIfModuleNotFoundError(error, module) {
    const isModuleNotFoundError = error && error.code === 'MODULE_NOT_FOUND' && error.message.match(new RegExp(module));
    if (!isModuleNotFoundError) {
      logger.error('Invalid `' + scope.generatorType + '` generator.');
      throw error;
    } else {
      return error;
    }
  }

  // Try to require the module or throw if error.
  try {
    generator = require('../../' + module);
  } catch (error) {
    throwIfModuleNotFoundError(error, module);
  }

  if (!generator) {
    return logger.error('No generator called `' + scope.generatorType + '` found.');
  }

  generate(generator, scope, cb);
};
