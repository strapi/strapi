'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');
const includeAll = require('include-all');

/**
 * dictionary
 *
 * Go through each object, include the code, and determine its identity.
 * Tolerates non-existent files/directories by ignoring them.
 *
 *
 * Options:
 *
 *   - `dirname`: The path to the source directory.
 *
 *   - `identity`: If disabled, (explicitly set to false) don't inject an identity
 *      into the module. Also don't try to use the bundled `identity` property in
 *      the module to determine the keyname in the result object.
 *      Defaults to: `true`
 *
 *   - `optional`: If enabled, fail silently and return `{}` when source directory
 *      does not exist or cannot be read (otherwise, exit with an error).
 *      Defaults to: `false`
 *
 *   - `depth`: The level of recursion where modules will be included.
 *
 *   - `filter`: Only include modules whose `filename` matches this regex.
 *      Defaults to: `undefined`
 *
 *   - `pathFilter: Only include modules whose full relative path matches this regex
 *     (relative from the entry point directory).
 *      Defaults to: `undefined`
 *
 *   - `replaceExpr`: In identity: use this regex to remove substrings like 'Controller' or
 *     'Service' and replace them with the value of `replaceVal`.
 *
 *   - `dontLoad`: If `dontLoad` is set to `true`, don't run the module with V8 or load it
 *      into memory. Instead, return a tree representing the directory structure
 *      (all extant file leaves are included as keys, with their value = `true`).
 *
 *   - `useGlobalIdForKeyName: If set to true, don't lowercase the identity to get
 *      the keyname-- just use the globalId.
 */

module.exports = dictionary;

function dictionary(options, cb) {

  // Defaults.
  options.replaceVal = options.replaceVal || '';

  // Deliberately exclude source control directories.
  if (!options.excludeDirs) {
    options.excludeDirs = /^\.(git|svn)$/;
  }

  const files = includeAll(options);

  // Start building the module dictionary.
  let dictionary = {};

  // Iterate through each module in the set.
  _.forEach(files, (module, filename) => {

    // Build the result object by merging all of the target modules
    // NOTE: Each module must export an object in order for this to work
    // (e.g. for building a configuration object from a set of config files)
    if (options.aggregate) {

      // Check that source module is a valid object.
      if (!_.isPlainObject(module)) {
        return cb(new Error('Invalid module:' + module));
      }

      // Merge module into dictionary.
      _.merge(dictionary, module);

      return;
    }

    // Keyname is how the module will be identified in the returned module tree.
    let keyName = filename;

    // If a module is found but marked as `undefined`,
    // don't actually include it (since it's probably unusable).
    if (typeof module === 'undefined') {
      return;
    }

    // Unless the `identity` option is explicitly disabled,
    // (or `dontLoad` is set).
    if (!options.dontLoad && options.identity !== false) {

      // If no `identity` property is specified in module, infer it from the filename.
      if (!module.identity) {
        if (options.replaceExpr) {
          module.identity = filename.replace(options.replaceExpr, options.replaceVal);
        } else {
          module.identity = filename;
        }
      }

      // `globalId` is the name of the variable for this module
      // that will be exposed globally in Strapi unless configured otherwise
      // Generate `globalId` using the original value of `module.identity`.
      if (!module.globalId) {
        module.globalId = module.identity;
      }

      // `identity` is the all-lowercase version
      module.identity = module.identity.toLowerCase();

      // Use the identity for the key name.
      keyName = options.useGlobalIdForKeyName ? module.globalId : module.identity;
    }

    // Save the module's contents in our dictionary object
    // (this will actually just be `true` if the `dontLoad` option is set).
    dictionary[keyName] = module;
  });

  // Always return at least an empty object.
  dictionary = dictionary || {};

  return cb(null, dictionary);
}

/**
 * Build a dictionary of named modules
 * (responds with an error if the container cannot be loaded).
 *
 * @param {Object} options
 * @param {Function} cb
 */

module.exports.required = (options, cb) => {
  return dictionary(options, cb);
};

/**
 * Build a dictionary of named modules
 * (fails silently, returns {} if the container cannot be loaded).
 *
 * @param {Object} options
 * @param {Function} cb
 */

module.exports.optional = (options, cb) => {
  options.optional = true;
  return dictionary(options, cb);
};

/**
 * Build a dictionary indicating whether the matched modules exist
 * (fails silently, returns {} if the container cannot be loaded).
 *
 * @param {Object} options
 * @param {Function} cb
 */

module.exports.exists = (options, cb) => {
  options.optional = true;
  options.dontLoad = false;
  return dictionary(options, cb);
};

/**
 * Build a single module object by extending {} with the contents of each module
 * (fail silently, returns {} if the container cannot be loaded).
 *
 * @param {Object} options
 * @param {Function} cb
 */

module.exports.aggregate = (options, cb) => {
  options.aggregate = true;
  options.optional = true;
  return dictionary(options, cb);
};
