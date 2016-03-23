'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const _ = require('lodash');
const async = require('async');
const fs = require('fs');
const path = require('path');

// Public node modules.
const beautify = require('js-beautify').js_beautify;

// Local utilities.
const dictionary = require('strapi/util/dictionary');

/**
 * Runs after this generator has finished
 *
 * @param {Object} scope
 * @param {Function} cb
 */

module.exports = function afterGenerate(scope, cb) {
  async.parallel({
    migrationFile: function (cb) {
      const migrationFile = path.resolve(scope.rootPath, 'data', 'migrations', scope.connection, scope.filename);

      // Read the migration file.
      fs.readFile(migrationFile, 'utf8', function (err, data) {
        if (err) {
          return cb.invalid(err);
        }

        // And rewrite it with the beautify node module.
        fs.writeFile(migrationFile, beautify(data, {
          indent_size: 2,
          keep_function_indentation: true,
          space_before_conditional: true,
          end_with_newline: true
        }), 'utf8', function (err) {
          if (err) {
            return cb(err, null);
          } else {
            return cb(null, null);
          }
        });
      });
    },
    settings: function (cb) {
      dictionary.aggregate({
        dirname: path.resolve(scope.rootPath, 'api'),
        filter: /(.+)\.settings.json$/,
        depth: 4
      }, cb);
    },
    functions: function (cb) {
      dictionary.aggregate({
        dirname: path.resolve(scope.rootPath, 'api'),
        filter: /(.+)\.js$/,
        depth: 4
      }, cb);
    }
  }, function (err, data) {
    if (err) {
      return cb.invalid(err);
    }

    // Fetch all models
    const models = _.get(_.merge(data.settings, data.functions), 'models');

    if (!_.isUndefined(models)) {
      _.mapValues(models, function (model) {
        return _.omitBy(model, _.isFunction);
      });

      const historyFile = path.resolve(scope.rootPath, 'data', 'migrations', '.history');

      // And rewrite it with the beautify node module.
      fs.writeFile(historyFile, beautify(JSON.stringify(models), {
        indent_size: 2,
        keep_function_indentation: true,
        space_before_conditional: true,
        end_with_newline: true
      }), 'utf8', function (err) {
        if (err) {
          return cb.invalid(err);
        } else {
          return cb.success();
        }
      });
    }
  });
};
