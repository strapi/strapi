'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');
const async = require('async');

// Local utils.
const actionUtil = require('../actionUtil');

/**
 * Add an entry to a specific parent entry
 */

module.exports = function destroy(_ctx) {
  return new Promise(function (resolve, reject) {
    // Ensure a model and alias can be deduced from the request.
    const Model = actionUtil.parseModel(_ctx);
    const relation = _ctx.params.relation;
    if (!relation) {
      _ctx.status = 500;
      return reject({
        message: 'Missing required route option, `_ctx.params.relation`.'
      });
    }

    // The primary key of the parent record.
    const parentPk = _ctx.params.parentId;

    // Find the alias key.
    const associationAttr = _.findWhere(strapi.orm.collections[_ctx.model].associations, {alias: relation});

    // Init the child model.
    const ChildModel = strapi.orm.collections[associationAttr.collection];
    const childPkAttr = ChildModel.primaryKey;

    _ctx.options = _ctx.options || {};

    // The child record to associate is defined by either...
    // a primary key or an object of values.
    let child;
    const supposedChildPk = actionUtil.parsePk(_ctx);
    if (supposedChildPk) {
      child = {};
      child[childPkAttr] = supposedChildPk;
    } else {
      _ctx.options.values = _ctx.options.values || {};
      _ctx.options.values.blacklist = _ctx.options.values.blacklist || ['limit', 'skip', 'sort', 'id', 'parentId'];
      child = actionUtil.parseValues(_ctx);
    }

    if (!child) {
      _ctx.status = 400;
      reject({
        message: 'You must specify the record to add (either the primary key of an existing record to link, or a new object without a primary key which will be used to create a record then link it.)'
      });
    }

    async.auto({
      // Look up the parent record.
      parent: function (cb) {
        Model.findOne(parentPk).exec(function foundParent(err, parentRecord) {
          if (err) {
            return cb(err);
          }
          if (!parentRecord) {
            return cb({status: 404});
          }
          if (!parentRecord[relation]) {
            return cb({status: 404});
          }
          cb(null, parentRecord);
        });
      },

      // If a primary key was specified in the `child` object we parsed
      // from the request, look it up to make sure it exists. Send back its primary key value.
      // This is here because, although you can do this with `.save()`, you can't actually
      // get ahold of the created child record data, unless you create it first.
      actualChildPkValue: ['parent', function (cb) {

        // Below, we use the primary key attribute to pull out the primary key value
        // (which might not have existed until now, if the .add() resulted in a `create()`).
        // If the primary key was specified for the child record, we should try to find
        // it before we create it.
        // Otherwise, it must be referring to a new thing, so create it.
        if (child[childPkAttr]) {
          ChildModel.findOne(child[childPkAttr]).exec(function foundChild(err, childRecord) {
            if (err) {
              return cb(err);
            }

            // Didn't find it? Then try creating it.
            if (!childRecord) {
              return createChild();
            }

            // Otherwise use the one we found.
            return cb(null, childRecord[childPkAttr]);
          });
        } else {
          return createChild();
        }

        // Create a new instance and send out any required pub/sub messages.
        function createChild() {
          ChildModel.create(child).exec(function createdNewChild(err, newChildRecord) {
            if (err) {
              return cb(err);
            }

            return cb(null, newChildRecord[childPkAttr]);
          });
        }
      }],

      // Add the child record to the parent's collection.
      add: ['parent', 'actualChildPkValue', function (cb, asyncData) {

        // `collection` is the parent record's collection we
        // want to add the child to.
        try {
          const collection = asyncData.parent[relation];
          collection.add(asyncData.actualChildPkValue);
          return cb();
        } catch (err) {
          if (err) {
            return cb(err);
          }

          return cb();
        }
      }]
    },

    // Save the parent record.
    function readyToSave(err, asyncData) {
      if (err) {
        _ctx.status = 400;
        reject(err);
      }

      asyncData.parent.save(function saved(err) {

        // Ignore `insert` errors for duplicate adds
        // (but keep in mind, we should not `publishAdd` if this is the case...)
        const isDuplicateInsertError = (err && typeof err === 'object' && err.length && err[0] && err[0].type === 'insert');
        if (err && !isDuplicateInsertError) {
          reject(err);
        }

        // Finally, look up the parent record again and populate the relevant collection.
        let query = Model.findOne(parentPk);

        query = actionUtil.populateEach(query, _ctx, Model);
        query.populate(relation);

        query.exec(function (err, matchingRecord) {
          if (err) {
            return reject(err);
          }
          if (!matchingRecord) {
            return reject({
              message: 'Matching record not found.'
            });
          }
          if (!matchingRecord[relation]) {
            return reject({
              message: '`matchingRecord[relation]` not found.'
            });
          }

          return resolve(matchingRecord);
        });
      });
    });
  });
};
