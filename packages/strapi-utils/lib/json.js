'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const fs = require('fs');

// Public node modules.
const _ = require('lodash');

/**
 * `parseJSONFile()`
 *
 * Read a json file at the specified path.
 * If an error occurs, call cb(err), and dont throw!
 *
 * @api private
 */

exports.parseJSONFile = (path, cb) => {
  if (!cb) {
    throw new Error('Callback required!');
  }

  if (cb === 'sync') {
    let jsonString;

    try {
      jsonString = fs.readFileSync(path, 'utf-8');
    } catch (e) {
      return false;
    }

    return andThen(jsonString);
  }

  fs.readFile(path, 'utf-8', (err, file) => {
    if (err) {
      return cb(err);
    }

    andThen(file);
  });

  // Attempt to parse JSON, then return.
  function andThen(json) {
    let err;

    try {
      json = JSON.parse(json);
    } catch (e) {
      err = e;
      json = false;
    }

    // Parse failed.
    if (err) {
      if (cb === 'sync') {
        return false;
      }
      return cb(err);
    }

    // Success.
    if (cb === 'sync') {
      return json;
    }

    return cb(null, json);
  }
};

/**
 * `getJSONFileSync()`
 *
 * Synchronous version of `getJSONFile()`.
 * Returns false if json file cannot be read or parsed.
 *
 * @api private
 */

exports.parseJSONFileSync = path => {
  return exports.parseJSONFile(path, 'sync');
};

/**
 * `getPackage()`
 *
 * Read `package.json` file in the directory at the specified
 * path. If an error occurs, call `cb(err)`, and dont throw!
 *
 * @api private
 */

exports.getPackage = (path, cb) => {
  path = _.trimEnd(path, '/');
  path += '/package.json';

  exports.parseJSONFile(path, (err, json) => {
    if (err) {
      return cb(err);
    }

    // Success: ensure dependencies are at least an empty object
    json.dependencies = json.dependencies || {};
    if (cb === 'sync') {
      return json;
    }

    return cb(null, json);
  });
};

/**
 * `getPackageSync()`
 *
 * Synchronous version of `getPackage()`
 * Returns `false` if `package.json` cannot be read or parsed.
 *
 * @api private
 */

exports.getPackageSync = path => {
  path = _.trimEnd(path, '/');
  path += '/package.json';

  // Success: ensure dependencies are at least an empty object.
  const json = exports.parseJSONFileSync(path, 'sync');

  if (!json) {
    return json;
  }

  json.dependencies = json.dependencies || {};
  return json;
};
