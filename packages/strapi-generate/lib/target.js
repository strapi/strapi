'use strict';

/**
 * Module dependencies
 */

/* eslint-disable prefer-template */
// Node.js core.
const path = require('path');
const util = require('util');

// Public node modules.
const _ = require('lodash');
const async = require('async');
const report = require('reportback')();

// Local dependencies.
const folderHelper = require('./helpers/folder');
const templateHelper = require('./helpers/template');
const jsonFileHelper = require('./helpers/jsonfile');
const copyHelper = require('./helpers/copy');

/**
 * generateTarget()
 *
 * @param {Object} options
 */

function generateTarget(options, cb) {
  const sb = report.extend(cb);

  // Options.
  let target = options.target;
  let scope = options.scope;
  const parentGenerator = options.parent;
  const recursiveGenerate = options.recursiveGenerate;

  const maxResolves = 5;
  let _resolves = 0;

  async.until(
    () => {
      return isValidTarget(target) || ++_resolves > maxResolves;
    },
    asyncCb => {
      parseTarget(target, scope, (err, resolvedTarget) => {
        if (err) {
          return asyncCb(err);
        }
        target = resolvedTarget;
        return asyncCb();
      });
    },
    err => {
      if (err) {
        return sb(err);
      }
      if (!isValidTarget(target)) {
        return sb(new Error('Generator Error :: Could not resolve target `' + scope.rootPath + '` (probably a recursive loop)'));
      }

      // Pass down parent Generator's template directory abs path.
      scope.templatesDirectory = parentGenerator.templatesDirectory;

      if (target.copy) {
        scope = mergeSubtargetScope(scope, typeof target.copy === 'string' ? {
          templatePath: target.copy
        } : target.copy);
        return copyHelper(scope, sb);
      }

      if (target.folder) {
        scope = mergeSubtargetScope(scope, target.folder);
        return folderHelper(scope, sb);
      }

      if (target.template) {
        scope = mergeSubtargetScope(scope, typeof target.template === 'string' ? {
          templatePath: target.template
        } : target.template);

        return templateHelper(scope, sb);
      }

      if (target.jsonfile) {
        if (typeof target.jsonfile === 'object') {
          scope = mergeSubtargetScope(scope, target.jsonfile);
        } else if (typeof target.jsonfile === 'function') {
          scope = _.merge(scope, {
            data: target.jsonfile(scope)
          });
        }
        return jsonFileHelper(scope, sb);
      }

      // If we made it here, this must be a recursive generator.
      // Now that the generator definition has been resolved,
      // call this method recursively on it, passing along our
      // callback.
      if (++scope._depth > scope.maxHops) {
        return sb(new Error('`maxHops` (' + scope.maxHops + ') exceeded! There is probably a recursive loop in one of your generators.'));
      }
      return recursiveGenerate(target, scope, sb);
    }
  );
}

module.exports = generateTarget;

/**
 * @param {[Type]} scope Description
 * @param {[Type]} subtarget Description
 * @return {[Type]} Description
 */

function mergeSubtargetScope(scope, subtarget) {
  return _.merge(scope, _.isObject(subtarget) ? subtarget : {});
}

/**
 * Known helpers
 *
 * @type {Array}
 */

const knownHelpers = ['folder', 'template', 'jsonfile', 'file', 'copy'];

function targetIsHelper(target) {
  return _.some(target, (subTarget, key) => {
    return _.includes(knownHelpers, key);
  });
}

/**
 * @param {String|Object} target Description
 * @param {Object} scope Description
 * @param {Function} cb Description
 * @return {[type]} Description
 */

function parseTarget(target, scope, cb) {
  if (typeof target === 'string') {
    target = {
      generator: target
    };
  }

  // Interpret generator definition.
  if (targetIsHelper(target)) {
    return cb(null, target);
  }

  if (target.generator) {

    // Normalize the subgenerator reference.
    let subGeneratorRef;
    if (typeof target.generator === 'string') {
      subGeneratorRef = {
        module: target.generator
      };
    } else if (typeof target.generator === 'object') {
      subGeneratorRef = target.generator;
    }

    if (!subGeneratorRef) {
      return cb(new Error('Generator Error :: Invalid subgenerator referenced for target `' + scope.rootPath + '`'));
    }

    // Now normalize the sub-generator.
    let subGenerator;

    // No `module` means we'll treat this subgenerator as an inline generator definition.
    if (!subGeneratorRef.module) {
      subGenerator = subGeneratorRef;
      if (subGenerator) {
        return cb(null, subGenerator);
      }
    }

    // Otherwise, we'll attempt to load this subgenerator.
    if (typeof subGeneratorRef.module === 'string') {

      // Lookup the generator by name if a `module` was specified
      // This allows the module for a given generator to be
      // overridden.
      const configuredReference = scope.modules && scope.modules[subGeneratorRef.module];

      // Refers to a configured module.
      // If this generator type is explicitly set to `false`,
      // disable the generator.
      if (configuredReference) {
        return cb(null, configuredReference);
      } else if (configuredReference === false) {
        return cb(null);
      }

      // If `configuredReference` is undefined, continue on
      // and try to require the module.
    }

    // At this point, `subGeneratorRef.module` should be a string,
    // and the best guess at the generator module we're going
    // to get.
    const module = subGeneratorRef.module;
    let requireError;

    // Try requiring it directly as a path.
    try {
      subGenerator = require(module);
    } catch (e0) {
      requireError = e0;
    }

    // Try the scope's `rootPath`.
    if (!subGenerator) {
      try {
        const asDependencyInRootPath = path.resolve(scope.rootPath, 'node_modules', module);
        subGenerator = require(asDependencyInRootPath);
      } catch (e1) {
        requireError = e1;
      }
    }

    // Try the current working directory.
    if (!subGenerator) {
      try {
        subGenerator = require(path.resolve(process.cwd(), 'node_modules', module));
      } catch (e1) {
        requireError = e1;
      }
    }

    // If we couldn't find a generator using the configured module,
    // try requiring `strapi-generate-<module>` to get the core generator.
    if (!subGenerator && !module.match(/^strapi-generate-/)) {
      try {
        if (process.mainModule.filename.indexOf('yarn') !== -1) {
          subGenerator = require(path.resolve(process.mainModule.paths[2], 'strapi-generate-' + module));
        } else {
          subGenerator = require(path.resolve(process.mainModule.paths[1], 'strapi-generate-' + module));
        }
      } catch (e1) {
        requireError = e1;
      }
    }

    // If we were able to find it, send it back!
    if (subGenerator) {
      return cb(null, subGenerator);
    }

    // But if we still can't find it, give up.
    return cb(new Error('Error: Failed to load `' + subGeneratorRef.module + '`...' + (requireError ? ' (' + requireError + ')' : '') +''));
  }

  return cb(new Error('Unrecognized generator syntax in `targets["' + scope.keyPath + '"]` ::\n' + util.inspect(target)));
}

/**
 *
 * @param {[Type]} target Description
 * @return {Boolean} Description
 */

function isValidTarget(target) {
  let ok = true;

  ok = ok && typeof target === 'object';

  // Is using a helper.
  // Or is another generator def.
  ok = ok && (targetIsHelper(target) || _.has(target, 'targets'));

  return ok;
}
