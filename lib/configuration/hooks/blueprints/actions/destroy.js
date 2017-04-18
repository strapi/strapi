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
 * Destroy an entry
 */

module.exports = function destroy(_ctx) {
  return new Promise(function (resolve, reject) {
    // Return the model used.
    const Model = actionUtil.parseModel(_ctx);

    // Locate and validate the required `id` parameter.
    const pk = actionUtil.requirePk(_ctx);

    // First, check if the record exists.
    const query = Model.findOne(pk);
    query.exec(function foundRecord(err, record) {
      if (err) {
        _ctx.status = 500;
        reject(err);
      }

      // Record not found.
      if (!record) {
        _ctx.status = 404;
        reject({
          message: 'No record found with the specified `id`.'
        });
      }

      // Destroy the record.
      Model.destroy(pk).exec(function destroyedRecord(err, deletedRecords) {
        if (err) {
          _ctx.status = 500;
          return reject(err);
        }

        // Select the first object of the updated records.
        const deletedRecord = deletedRecords[0];

        // Update the `oneToOne` relations.
        const relationPromises = [];
        _.forEach(_.where(Model.associations, {nature: 'oneToOne'}), function (relation) {
          relationPromises.push(associationUtil.removeRelationsOut(_ctx.model || _ctx.params.model, deletedRecord.id, relation.model));
        });

        // Update the `oneToMany` relations.
        _.forEach(_.where(Model.associations, {nature: 'oneToMany'}), function (relation) {
          relationPromises.push(associationUtil.removeRelationsOut(_ctx.model || _ctx.params.model, deletedRecord.id, relation.collection));
        });

        Promise.all(relationPromises)

        // Related records updated.
          .then(function () {
            resolve(deletedRecord);
          })

          // Error during related records update.
          .catch(function (err) {
            _ctx.status = 500;
            reject(err);
          });
      });
    });
  });
};
