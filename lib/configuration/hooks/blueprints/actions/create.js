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
 * Create an entry
 */

module.exports = function create(_ctx) {
  return new Promise(function (resolve, reject) {

    // Return the model used.
    const Model = actionUtil.parseModel(_ctx);

    // Parse the values of the record to create.
    const values = actionUtil.parseValues(_ctx);

    // Associations validation.
    const associationsValidationPromises = [];

    // Check if the relations are existing for `OneWay` associations.
    _.forEach(_.where(Model.associations, {nature: 'oneWay'}), function (association) {
      if (values[association.alias] || association.required) {
        associationsValidationPromises.push(associationUtil.doesRecordExist(association.model, values[association.alias]));
      }
    });

    // Check if the relations are existing for `OneToOne` associations.
    _.forEach(_.where(Model.associations, {nature: 'oneToOne'}), function (association) {
      if (values[association.alias] || association.required) {
        associationsValidationPromises.push(associationUtil.doesRecordExist(association.model, values[association.alias]));
      }
    });

    Promise.all(associationsValidationPromises)
      .then(function () {
        Model.create(values).exec(function created(err, newInstance) {
          if (err) {
            _ctx.status = 400;
            return reject(err);
          }

          // Update `oneToOneRelations`.
          const relationPromises = [];

          // Update the `oneToOne` relations.
          _.forEach(_.where(Model.associations, {nature: 'oneToOne'}), function (relation) {
            relationPromises.push(associationUtil.oneToOneRelationUpdated(_ctx.model || _ctx.params.model, newInstance.id, relation.model, newInstance[relation.alias]));
          });

          Promise.all(relationPromises)

          // Related records updated.
            .then(function () {
              let query = Model.findOne(newInstance[Model.primaryKey]);
              query = actionUtil.populateEach(query, _ctx, Model);
              query.exec(function foundAgain(err, populatedRecord) {
                if (err) {
                  _ctx.status = 500;
                  return reject(err);
                }

                // Entry created.
                _ctx.status = 201;
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

      // Error during related records check.
      .catch(function (err) {
        _ctx.status = 400;
        reject(err);
      });
  });
};
