'use strict';

/**
 * Module dependencies
 */

// Local utils.
const actionUtil = require('../actionUtil');

/**
 * Find entries
 */

module.exports = function find(_ctx) {
  return new Promise(function (resolve, reject) {
    // Use the `findOne` action if an `id` is specified.
    if (actionUtil.parsePk(_ctx)) {
      return require('./findOne')(_ctx);
    }

    // Look up the model.
    const Model = actionUtil.parseModel(_ctx);

    // Init the query.
    let query = Model.find()
      .where(actionUtil.parseCriteria(_ctx))
      .limit(actionUtil.parseLimit(_ctx))
      .skip(actionUtil.parseSkip(_ctx))
      .sort(actionUtil.parseSort(_ctx));

    query = actionUtil.populateEach(query, _ctx, Model);
    query.exec(function found(err, matchingRecords) {
      if (err) {
        _ctx.status = 500;
        reject(err);
      }

      // Records found.
      resolve(matchingRecords);
    });
  });
};
