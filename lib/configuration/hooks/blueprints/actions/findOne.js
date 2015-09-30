'use strict';

/**
 * Module dependencies
 */

// Local utils.
const actionUtil = require('../actionUtil');

/**
 * Find a specific entry
 */

module.exports = function destroy(_ctx) {
  const deferred = Promise.defer();

  // Return the model used.
  const Model = actionUtil.parseModel(_ctx);

  // Locate and validate the required `id` parameter.
  const pk = actionUtil.requirePk(_ctx);

  // Init the query.
  let query = Model.findOne(pk);
  query = actionUtil.populateEach(query, _ctx, Model);
  query.exec(function found(err, matchingRecord) {
    if (err) {
      _ctx.status = 500;
      deferred.reject(err);
    }
    if (!matchingRecord) {
      _ctx.status = 404;

      return deferred.reject({
        message: 'No ' + Model.name + ' found with the specified `id`.'
      });
    }

    // Record found.
    deferred.resolve(matchingRecord);
  });

  return deferred.promise;
};
