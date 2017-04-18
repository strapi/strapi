'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');

// Local utils.
const actionUtil = require('../actionUtil');
const associationUtil = require('../associationUtil');

/**
 * Remove an entry to a specific parent entry
 */

module.exports = function remove(_ctx) {
  return new Promise(function (resolve, reject) {
    // Ensure a model and alias can be deduced from the request.
    const Model = actionUtil.parseModel(_ctx);
    _ctx.options = _ctx.options || {};
    const relation = _ctx.params.relation;
    const associationAttr = _.findWhere(strapi.orm.collections[_ctx.model].associations, {alias: relation});

    if (!associationAttr) {
      _ctx.status = 500;
      return reject({
        message: 'Missing required route option, `_ctx.options.alias`.'
      });
    }

    // The primary key of the parent record.
    const parentPk = _ctx.params.parentId;

    // The primary key of the child record to remove
    // from the aliased collection.
    let childPk = actionUtil.parsePk(_ctx);

    // Check if the `childPk` is defined.
    if (_.isUndefined(childPk)) {
      _ctx.status = 400;
      return reject({
        message: 'Missing required child PK.'
      });
    }

    // Find the parent object.
    Model.findOne(parentPk)
      .populate(relation)
      .exec(function found(err, parentRecord) {
        if (err) {
          _ctx.status = 500;
          return reject(err);
        }

        // Format `childPk` for the `findWhere` used next.
        childPk = isNaN(childPk) ? childPk : Number(childPk);

        if (!parentRecord || !parentRecord[relation] || (!_.findWhere(parentRecord[relation], {id: childPk})) && parentRecord[relation].id !== childPk) {
          _ctx.status = 404;
          return reject({
            message: 'Not found'
          });
        }

        const relationPromises = [];

        if (parentRecord[relation].id === childPk) {

          // Set to null
          parentRecord[relation] = null;
          relationPromises.push(associationUtil.removeRelationsOut(_ctx.model || _ctx.params.model, parentRecord.id, relation));
        } else if (_.findWhere(parentRecord[relation], {id: childPk})) {

          // Remove.
          parentRecord[relation].remove(childPk);
        }

        // Save.
        parentRecord.save(function (err) {
          if (err) {
            _ctx.status = 400;
            return reject(err);
          }

          Promise.all(relationPromises)
            .then(function () {

              // New query to `findOne` and properly populate it.
              let query = Model.findOne(parentPk);
              query = actionUtil.populateEach(query, _ctx, Model);
              query.exec(function found(err, parentRecord) {
                if (err || !parentRecord) {
                  _ctx.status = 500;
                  return reject(err);
                }
                return resolve(parentRecord);
              });
            })
            .catch(function (err) {
              reject(err);
            });
        });
      });
  });
};
