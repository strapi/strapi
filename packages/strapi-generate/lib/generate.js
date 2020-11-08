'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');
const util = require('util');

// Public node modules.
const _ = require('lodash');
const async = require('async');
const reportback = require('reportback')();

// Local dependencies.
const pathRegexp = require('./util').pathRegexp;
const generateTarget = require('./target');

/**
 * Run a generator given an existing scope
 *
 * @param {Object} generator
 * @param {Object} scope
 * @param {Switchback} cb
 */

/* eslint-disable prefer-template */
function generate(generator, scope, cb) {
  const sb = reportback.extend(cb, {
    error: cb.error,
    invalid: cb.invalid,
    alreadyExists: 'error',
  });

  // Resolve string shorthand for generator defs
  // to `{ generator: 'originalDef' }`.
  if (typeof generator === 'string') {
    const generatorName = generator;
    generator = {
      generator: generatorName,
    };
  }

  // Run the generator's `before()` method proceeding.
  generator.before(
    scope,
    reportback.extend({
      error: sb.error,
      invalid: sb.invalid,
      success: () => {
        // Process all of the generator's targets concurrently.
        async.each(
          Object.keys(generator.targets),
          (keyPath, asyncEachCb) => {
            const asyncEachSb = reportback.extend(asyncEachCb);

            // Create a new scope object for this target,
            // with references to the important bits of the original
            // (depth will be passed-by-value, but that's what we want).
            // Then generate the target, passing along a reference to
            // the base `generate` method to allow for recursive generators.
            const target = generator.targets[keyPath];
            if (!target) {
              return asyncEachSb(
                new Error(
                  'Error: Invalid target: {"' + keyPath + '": ' + util.inspect(target) + '}'
                )
              );
            }

            // Input tolerance.
            if (keyPath === '') {
              keyPath = '.';
            }

            // Interpret `keyPath` using Express's parameterized route conventions,
            // first parsing params, then replacing them with their proper values from scope.
            const params = [];
            pathRegexp(keyPath, params);
            let err;
            const parsedKeyPath = _.reduce(
              params,
              (memoKeyPath, param) => {
                if (err) {
                  return false;
                }

                try {
                  const paramMatchExpr = ':' + param.name;
                  let actualParamValue = scope[param.name];
                  if (!actualParamValue) {
                    err = new Error(
                      'generator error:\n' +
                        'A scope variable (`' +
                        param.name +
                        '`) was referenced in target: `' +
                        memoKeyPath +
                        '`,\n' +
                        'but `' +
                        param.name +
                        "` does not exist in the generator's scope."
                    );
                    return false;
                  }
                  actualParamValue = String(actualParamValue);

                  return memoKeyPath.replace(paramMatchExpr, actualParamValue);
                } catch (e) {
                  err = new Error('Error: Could not parse target key ' + memoKeyPath);
                  err.message = e;
                  return false;
                }
              },
              keyPath
            );
            if (!parsedKeyPath) {
              return asyncEachSb(err);
            }

            // Create path from `rootPath` to `keyPath` to use as the `rootPath`
            // for any generators or helpers in this target
            // (use a copy so that child generators don't mutate the scope).
            const targetScope = _.merge({}, scope, {
              rootPath: path.resolve(scope.rootPath, parsedKeyPath),

              // Include reference to original keypath for error reporting.
              keyPath,
            });

            // If `target` is an array, run each item.
            if (_.isArray(target)) {
              async.eachSeries(
                target,
                (targetItem, asyncEachSeriesCb) => {
                  generateTarget(
                    {
                      target: targetItem,
                      parent: generator,
                      scope: _.cloneDeep(targetScope),
                      recursiveGenerate: generate,
                    },
                    asyncEachSeriesCb
                  );
                },
                asyncEachSb
              );
              return;
            }

            // Otherwise, just run the single target generator/helper.
            generateTarget(
              {
                target,
                parent: generator,
                scope: targetScope,
                recursiveGenerate: generate,
              },
              asyncEachSb
            );
          },

          err => {
            // Expose a `error` handler in generators.
            if (err) {
              const errorFn =
                generator.error ||
                function defaultError(err, scope, _cb) {
                  return _cb(err);
                };
              return errorFn(err, scope, sb);
            }

            // Expose a `after` handler in generators (on success only).
            const afterFn =
              generator.after ||
              function defaultAfter(scope, _cb) {
                return _cb();
              };
            return afterFn(scope, sb);
          }
        );
      },
    })
  );
}

module.exports = generate;
