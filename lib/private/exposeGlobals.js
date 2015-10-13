'use strict';

/**
 * `exposeGlobals()`
 *
 * Expose certain global variables
 * (if config says so).
 *
 * @api private
 */

module.exports = function exposeGlobals() {
  const self = this;

  // Globals explicitly disabled.
  if (self.config.globals === false) {
    return;
  }

  // Expose globals as an empty object.
  self.config.globals = self.config.globals || {};

  // Expose Async globally if enabled.
  if (self.config.globals.async !== false) {
    global.async = require('async');
  }

  // Expose Lodash globally if enabled.
  if (self.config.globals._ !== false) {
    global._ = require('lodash');
  }

  // Expose Strapi globally if enabled.
  if (self.config.globals.strapi !== false) {
    global.strapi = self;
  }

  // Extend GraphQL if enabled.
  if (self.config.globals.graphql !== false) {
    global.graphql = require('graphql');

    global.graphql.query = function * (query) {
      const deferred = Promise.defer();

      this.graphql(self.schemas, query)
        .then(function (data) {
          deferred.resolve(data);
        })
        .catch(function (err) {
          deferred.reject(err);
        });

      return deferred.promise;
    };
  }
};
