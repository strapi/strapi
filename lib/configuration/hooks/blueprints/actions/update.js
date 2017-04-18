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

module.exports = function update(_ctx) {
  return new Promise(function (resolve, reject) {
    // Return the model used.
    const Model = actionUtil.parseModel(_ctx);

    // Locate and validate the required `id` parameter.
    const pk = actionUtil.requirePk(_ctx);

    // Parse the values of the record to update.
    const values = actionUtil.parseValues(_ctx);

    // No matter what, don't allow changing the `pk` via the update blueprint
    // (you should just drop and re-add the record if that's what you really want).
    if (typeof values[Model.primaryKey] !== 'undefined' && values[Model.primaryKey] !== pk) {
      strapi.log.warn('Cannot change primary key via update action; ignoring value sent for `' + Model.primaryKey + '`');
    }

    // Make sure the primary key is unchanged.
    values[Model.primaryKey] = pk;

    Model.findOne(pk).exec(function found(err, matchingRecord) {
      if (err) {
        _ctx.status = 500;
        return reject(err);
      }
      if (!matchingRecord) {
        _ctx.status = 404;
        return reject('Record not found');
      }

      // Associations validation.
      const associationsValidationPromises = [];

      // One way associations.
      _.forEach(_.where(Model.associations, {nature: 'oneWay'}), function (association) {
        if (values[association.alias] || association.required) {
          associationsValidationPromises.push(associationUtil.doesRecordExist(association.model, values[association.alias]));
        }
      });

      // One to one associations.
      _.forEach(_.where(Model.associations, {nature: 'oneToOne'}), function (association) {
        if (values[association.alias] || association.required) {
          associationsValidationPromises.push(associationUtil.doesRecordExist(association.model, values[association.alias]));
        }
      });

      // Check relations params.
      Promise.all(associationsValidationPromises)
        .then(function () {

          Model.update(pk, values).exec(function updated(err, records) {
            if (err) {
              _ctx.status = 400;
              return reject(err);
            }

            // Select the first and only one record.
            const updatedRecord = records[0];

            // Update `oneToOneRelations`.
            const relationPromises = [];
            _.forEach(_.where(Model.associations, {nature: 'oneToOne'}), function (relation) {
              relationPromises.push(associationUtil.oneToOneRelationUpdated(_ctx.model || _ctx.params.model, pk, relation.model, updatedRecord[relation.alias]));
            });

            // Update the related records.
            Promise.all(relationPromises)
              .then(function () {

                // Extra query to find and populate the updated record.
                let query = Model.findOne(updatedRecord[Model.primaryKey]);
                query = actionUtil.populateEach(query, _ctx, Model);

                query.exec(function foundAgain(err, populatedRecord) {
                  if (err) {
                    _ctx.status = 500;
                    return reject(err);
                  }

                  resolve(populatedRecord);
                });
              })

              // Error during related records update.
              .catch(function (err) {
                _ctx.status = 400;
                reject(err);
              });
          });
        })

        // Error during the new related records check.
        .catch(function (err) {
          _ctx.status = 400;
          reject(err);
        });
    });
  });
};
