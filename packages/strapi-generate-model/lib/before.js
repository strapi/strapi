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
const { nameToSlug, nameToCollectionName } = require('strapi-utils');

// Fetch stub attribute template on initial load.
const attributeTemplate = fs.readFileSync(
  path.resolve(__dirname, '..', 'templates', 'attribute.template'),
  'utf8'
);
/* eslint-disable prefer-template */

/**
 * This `before` function is run before generating targets.
 * Validate, configure defaults, get extra dependencies, etc.
 *
 * @param {Object} scope
 * @param {Function} cb
 */

module.exports = (scope, cb) => {
  if (!scope.rootPath || !scope.id) {
    return cb.invalid(
      'Usage: `$ strapi generate:model modelName --api apiName --plugin pluginName`'
    );
  }

  // Format `id`.
  const name = scope.name || nameToSlug(scope.id);

  // `scope.args` are the raw command line arguments.
  _.defaults(scope, {
    name,
    environment: process.env.NODE_ENV || 'development',
  });

  // Determine the destination path.
  let filePath;
  if (scope.args.api) {
    filePath = `./api/${scope.args.api}/models`;
  } else if (scope.args.plugin) {
    filePath = `./plugins/${scope.args.plugin}/models`;
  } else {
    filePath = `./api/${name}/models`;
  }

  // Take another pass to take advantage of the defaults absorbed in previous passes.
  _.defaults(scope, {
    rootPath: scope.rootPath,
    filePath,
    filename: `${name}.js`,
    filenameSettings: `${name}.settings.json`,
  });

  // Validate optional attribute arguments.
  const invalidAttributes = [];

  // Map attributes and split them.
  scope.attributes = scope.args.attributes.map(attribute => {
    const parts = attribute.split(':');

    parts[1] = parts[1] ? parts[1] : 'string';

    // Handle invalid attributes.
    if (!parts[1] || !parts[0]) {
      invalidAttributes.push('Error: Invalid attribute notation `' + attribute + '`.');
      return;
    }

    return {
      name: _.trim(_.deburr(_.camelCase(parts[0]).toLowerCase())),
      type: _.trim(_.deburr(_.camelCase(parts[1]).toLowerCase())),
    };
  });

  // Set collectionName
  scope.collectionName = _.has(scope.args, 'collectionName')
    ? scope.args.collectionName
    : nameToCollectionName(pluralize(scope.id));

  // Set description
  scope.description = _.has(scope.args, 'description') ? scope.args.description : undefined;

  // Handle invalid action arguments.
  // Send back invalidActions.
  if (invalidAttributes.length) {
    return cb.invalid(invalidAttributes);
  }

  // Make sure there aren't duplicates.
  if (
    _(scope.attributes.map(attribute => attribute.name))
      .uniq()
      .valueOf().length !== scope.attributes.length
  ) {
    return cb.invalid('Duplicate attributes not allowed!');
  }

  // Render some stringified code from the action template
  // and make it available in our scope for use later on.
  scope.attributes = scope.attributes
    .map(attribute => {
      const compiled = _.template(attributeTemplate);
      return _.trimEnd(
        _.unescape(
          compiled({
            name: attribute.name,
            type: attribute.type,
          })
        )
      );
    })
    .join(',\n');

  // Get default connection
  try {
    scope.connection =
      scope.args.connection ||
      JSON.parse(
        fs.readFileSync(
          path.resolve(scope.rootPath, 'config', 'environments', scope.environment, 'database.json')
        )
      ).defaultConnection ||
      '';
  } catch (err) {
    return cb.invalid(err);
  }

  // Trigger callback with no error to proceed.
  return cb();
};
