'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const fs = require('fs');
const path = require('path');

// Public node modules.
const _ = require('lodash');
const glob = require('glob');

// Template builder.
const builder = require('./builder');

/**
 * This `before` function is run before generating targets.
 * Validate, configure defaults, get extra dependencies, etc.
 *
 * @param {Object} scope
 * @param {Function} cb
 */

module.exports = function (scope, cb) {
  if (!scope.rootPath || !scope.args[0] || !scope.args[1]) {
    return cb.invalid('Usage: `$ strapi migrate:make <connection_name> <migration_name>`');
  }

  // `scope.args` are the raw command line arguments.
  _.defaults(scope, {
    connection: scope.args[0],
    name: scope.args[1],
    ext: '.js',
    environment: process.NODE_ENV || 'development'
  });

  // Take another pass to take advantage of the defaults absorbed in previous passes.
  _.defaults(scope, {
    rootPath: scope.rootPath,
    filename: _.now() + '_' + scope.name + scope.ext,
    connections: {},
    models: {}
  });

  // Humanize output.
  _.defaults(scope, {
    humanizeId: scope.args[0],
    humanizedPath: '`./data/migrations/' + scope.connection + '/`'
  });

  // Try to access the databases config and register connections
  // in the Knex query builder.
  try {
    fs.accessSync(path.resolve(scope.rootPath, 'config', 'environments', scope.environment, 'databases.json'), fs.F_OK | fs.R_OK);
  } catch (err) {
    return cb.invalid('No `databases.json` file detected at `' + path.resolve(scope.rootPath, 'config', 'environments', scope.environment) + '`.');
  }

  // Save the connections and the current DB config.
  scope.connections = JSON.parse(fs.readFileSync(path.resolve(scope.rootPath, 'config', 'environments', scope.environment, 'databases.json'))).connections;
  scope.dbConfig = scope.connections[scope.connection];

  // Make sure the specified connection exists in config.
  if (!_.has(scope.connections, scope.connection)) {
    return cb.invalid('No connection found for `' + scope.connection + '`.');
  }

  // Make sure the needed client is installed.
  _.forEach(scope.connections, function (config) {
    try {
      scope.db = require(path.resolve(scope.rootPath, 'node_modules', 'knex'))(scope.dbConfig);
    } catch (err) {
      return cb.invalid('The client `' + config.client + '` is not installed.');
    }
  });

  let history;
  try {
    history = JSON.parse(fs.readFileSync(path.resolve(scope.rootPath, 'data', 'migrations', '.history'), 'utf8'));
  } catch (err) {
    // File not existing
    history = {};
  }

  // Register every model.
  const migrations = glob.sync(path.resolve(scope.rootPath, 'api', '**', 'models', '*.json')).map((file) => {
    let modelName;

    // Only create migration file for the models with the specified connection.
    if (JSON.parse(fs.readFileSync(path.resolve(file))).connection === scope.connection) {

      // Save the model name thanks to the given table name.
      modelName = JSON.parse(fs.readFileSync(path.resolve(file))).tableName;
      scope.models[modelName] = JSON.parse(fs.readFileSync(path.resolve(file)));

      if (!_.isEmpty(history) && history.hasOwnProperty(_.capitalize(modelName))) {
        _.set(scope.models, modelName + '.oldAttributes', _.get(history, _.capitalize(modelName) + '.attributes'));
      } else {
        _.set(scope.models, modelName + '.oldAttributes', {});
      }

      // First, we need to know if the table already exists.
      scope.db.schema.hasTable(modelName).then(function (exists) {

        // If the table doesn't exist.
        if (!exists) {

          // Builder: add needed options specified in the model
          // for each option.
          _.forEach(scope.models[modelName].options, function (value, option) {
            builder.options(scope.models, modelName, value, option);
          });

          // Builder: create template for each attribute-- either with a column type
          // or with a relationship.
          _.forEach(scope.models[modelName].attributes, function (details, attribute) {
            if (details.type && _.isString(details.type)) {
              builder.types(scope.models, modelName, details, attribute);
            } else if (_.isString(details.collection) || _.isString(details.model)) {
              builder.relations(scope.models, modelName, details, attribute);
            }
          });

          // Builder: create and drop the table.
          builder.createTable(scope.models, modelName);
        }

        // If the table already exists.
        else {

          // Ideally, we need to verify the table properties here
          // to see if they still are the same.

          // Parse every attribute.
          _.forEach(scope.models[modelName].attributes, function (details, attribute) {
            // TODO:
            // - Column is existing ?
            // -- YES:
            // --- Compare current type with last one (nullable, maxLenght, type, defaultValue).
            // ---- Updated ? Drop column, and create a new one.
            // ---- Not updated ? Do nothing.
            // -- NO:
            // --- Add the new column

            // scope.db.schema.hasColumn(modelName, attribute).then(function (exists) {
            //
            // }).catch(function (err) {
            //   console.log(err);
            // });

            // Verify if a column already exists for the attribute.
            scope.models[modelName].newAttributes = {};

            // If it's a new attribute.
            if (!scope.models[modelName].oldAttributes.hasOwnProperty(attribute)) {
              // Save the attribute as a new attribute.
              scope.models[modelName].newAttributes[attribute] = _.cloneDeep(details);

              // Builder: create template for each attribute-- either with a column type
              // or with a relationship.
              if (details.type && _.isString(details.type)) {
                builder.types(scope.models, modelName, scope.models[modelName].newAttributes[attribute], attribute);
              } else if (_.isString(details.collection) || _.isString(details.model)) {
                builder.relations(scope.models, modelName, scope.models[modelName].newAttributes[attribute], attribute);
              }

              // Builder: select the table.
              builder.selectTable(scope.models, modelName);
            } else {
              // If the column already exists.

              let toDrop = false;

              // Try to identify relation attribute update
              if (details.hasOwnProperty('collection') && details.hasOwnProperty('via') &&
                (_.get(scope.models[modelName].oldAttributes[attribute], 'collection') !== details.collection || _.get(scope.models[modelName].oldAttributes[attribute], 'via') !== details.via)) {
                toDrop = true;
              } else if (details.hasOwnProperty('model') && details.hasOwnProperty('via') &&
                (_.get(scope.models[modelName].oldAttributes[attribute], 'model') !== details.model || _.get(scope.models[modelName].oldAttributes[attribute], 'via') !== details.via)) {
                toDrop = true;
              } else if (details.hasOwnProperty('model') &&
                (_.get(scope.models[modelName].oldAttributes[attribute], 'model') !== details.model)) {
                toDrop = true;
              } else if (!_.isUndefined(details.type) && _.get(scope.models[modelName].oldAttributes[attribute], 'type') !== _.get(details, 'type')) {
                toDrop = true;
              } else if (!_.isUndefined(details.defaultValue) && _.get(scope.models[modelName].oldAttributes[attribute], 'defaultValue') === _.get(details, 'defaultValue')) {
                toDrop = true;
              } else if (!_.isUndefined(details.maxLength) && _.get(scope.models[modelName].oldAttributes[attribute], 'maxLength') === _.get(details, 'maxLength')) {
                toDrop = true;
              } else if (!_.isUndefined(details.nullable) && _.get(scope.models[modelName].oldAttributes[attribute], 'nullable') === _.get(details, 'nullable')) {
                toDrop = true;
              }

              // The attribute has been updated.
              // We will drop it then create it again with the new options.
              if (toDrop) {
                // Save the attribute as a new attribute.
                scope.models[modelName].newAttributes[attribute] = _.cloneDeep(details);

                // Builder: create template for each attribute-- either with a column type
                // or with a relationship.
                if (details.type && _.isString(details.type)) {
                  builder.types(scope.models, modelName, scope.models[modelName].newAttributes[attribute], attribute, toDrop);
                } else if (_.isString(details.collection) || _.isString(details.model)) {
                  builder.relations(scope.models, modelName, scope.models[modelName].newAttributes[attribute], attribute, toDrop);
                }

                // Builder: select the table.
                builder.selectTable(scope.models, modelName);
              }
            }
          });
        }
      });

      return new Promise((resolve) => {
        asyncFunction(file, resolve);
      });
    }
  });

  function asyncFunction(item, cb) {
    setTimeout(() => {
      cb();
    }, 100);
  }

  Promise.all(migrations).then(() => cb.success());
};
