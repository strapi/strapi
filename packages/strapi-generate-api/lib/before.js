'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const fs = require('fs');
const path = require('path');

// Public node modules.
const _ = require('lodash');
const pluralize = require('pluralize');

// Fetch stub attribute template on initial load.
const ATTRIBUTE_TEMPLATE = fs.readFileSync(path.resolve(__dirname, '..', 'templates', 'attribute.template'), 'utf8');

/**
 * This `before` function is run before generating targets.
 * Validate, configure defaults, get extra dependencies, etc.
 *
 * @param {Object} scope
 * @param {Function} cb
 */

module.exports = function (scope, cb) {
  if (!scope.rootPath || !scope.args[0]) {
    return cb.invalid('Usage: `$ strapi generate api <myAPI> [attribute|attribute:type ...]`');
  }

  // `scope.args` are the raw command line arguments.
  _.defaults(scope, {
    id: scope.args[0],
    idPluralized: pluralize.plural(scope.args[0]),
    attributes: _.slice(scope.args, 1),
    environment: process.NODE_ENV || 'development'
  });

	// Test naming pattern for API name (required by GraphQL)
  const NAMEPATTERN = /^[_a-zA-Z][_a-zA-Z0-9]*$/;
  if (!NAMEPATTERN.test(scope.id)) {
    return cb.invalid('Names must match `/^[_a-zA-Z][_a-zA-Z0-9]*$/` but `' + scope.id + '` does not.');
  }

  // Validate optional attribute arguments.
  const invalidAttributes = [];

  // Map attributes and split them.
  const attributes = _.map(scope.attributes, function (attribute) {
    const parts = attribute.split(':');

    if (parts[1] === undefined) {
      parts[1] = 'string';
    }

    // Handle invalid attributes.
    if (!parts[1] || !parts[0]) {
      invalidAttributes.push('Error: Invalid attribute notation `' + attribute + '`.');
      return;
    }

    return {
      name: parts[0],
      type: parts[1]
    };
  });

  // Handle invalid action arguments.
  // Send back invalidActions.
  if (_.size(invalidAttributes) > 0) {
    return cb.invalid(invalidAttributes);
  }

  // Determine default values based on the available scope.
  _.defaults(scope, {
    globalID: _.capitalize(scope.id),
    ext: '.js',
    attributes: []
  });

  // Take another pass to take advantage of the defaults absorbed in previous passes.
  _.defaults(scope, {
    rootPath: scope.rootPath,
    filename: scope.globalID + scope.ext,
    filenameSettings: scope.globalID + '.settings.json'
  });

  // Humanize output.
  _.defaults(scope, {
    humanizeId: scope.args[0],
    humanizedPath: '`./api`'
  });

  // Get default connection
  try {
    scope.connection = JSON.parse(fs.readFileSync(path.resolve(scope.rootPath, 'config', 'environments', scope.environment, 'databases.json'))).defaultConnection || '';
  } catch (err) {
    return cb.invalid(err);
  }

  // Render some stringified code from the action template
  // and make it available in our scope for use later on.
  scope.attributes = _.map(_.uniqBy(attributes, 'name'), function (attribute) {
    const compiled = _.template(ATTRIBUTE_TEMPLATE);
    return _.trim(_.unescape(compiled({
      name: attribute.name,
      type: attribute.type
    })));
  }).join(',\n');

  // Trigger callback with no error to proceed.
  return cb.success();
};
