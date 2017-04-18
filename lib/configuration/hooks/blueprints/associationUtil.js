'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');

module.exports = {

  /**
   * Helper which returns a promise and then
   * the found record
   *
   * @param {Object} model
   * @param {string|int} id
   *
   * @return {Function|promise}
   */

  doesRecordExist: function doesRecordExist(model, id) {
    return new Promise(function (resolve, reject) {
      strapi.orm
        .collections[model]
        .findOne(id)
        .exec(function (err, foundRecord) {
          if (err) {
            return reject(err);
          }
          if (!foundRecord) {
            return reject({
              message: 'No ' + model + ' found with the specified `id`.'
            });
          }

          resolve(foundRecord);

        });

    });
  },

  /**
   * Helper which remove the relations of a specific entry and
   * update the new relation if a relationId is specified
   *
   * @param originalModelAlias
   * @param originalModelId
   * @param relationModel
   * @param relationId
   *
   * @return {Function|promise}
   */

  oneToOneRelationUpdated: function oneToOneRelationUpdated(originalModelAlias, originalModelId, relationModel, relationId) {
    return new Promise(function (resolve, reject) {
      // First remove all relations
      const promises = [];

      // Update the relation of the origin model
      promises.push(module.exports.removeRelationsOut(originalModelAlias, originalModelId, relationModel));

      // Update the entries of the same collection
      // of the original model.
      promises.push(module.exports.removeRelationsIn(originalModelAlias, originalModelId, relationModel, relationId));

      Promise.all(promises)
        .then(function () {

          // If a relationId is provided, update the new linked entry.
          if (relationId) {
            strapi.orm.collections[relationModel]
              .findOne(relationId)
              .exec(function (err, record) {
                if (err) {
                  return reject(err);
                }
                if (!record) {
                  return reject({
                    message: 'Relation not found'
                  });
                }
                record[originalModelAlias] = originalModelId;
                record.save(function (err, record) {
                  if (err) {
                    return reject(err);
                  }
                  resolve(record);
                });
              });
          } else {
            resolve();
          }
        })
        .catch(function (err) {
          reject(err);
        });
    });
  },

  /**
   * Helper which remove all the relations
   * of a specific model
   *
   * @param originalModelAlias
   * @param originalModelId
   * @param relationModel
   *
   * @return {Function|promise}
   */

  removeRelationsOut: function removeRelationsOut(originalModelAlias, originalModelId, relationModel) {
    return new Promise(function (resolve, reject) {
      if (!originalModelAlias) {
        return reject({
          message: 'originalModelAlias invalid.'
        });
      }

      // Params object used for the `find`function.
      const findParams = {};
      findParams[originalModelAlias] = originalModelId;

      // Find all the matching entries of the original model.
      strapi.orm.collections[relationModel]
        .find(findParams)
        .exec(function (err, records) {
          if (err) {
            return reject(err);
          }

          // Init the array of promises.
          const savePromises = [];

          // Set the relation to null.
          // Save the entry and add the promise in the array.
          _.forEach(records, function (record) {
            record[originalModelAlias] = null;
            savePromises.push(record.save());
          });

          Promise.all(savePromises)
            .then(function () {
              resolve(records);
            })
            .catch(function (err) {
              reject(err);
            });
        });
    });
  },

  /**
   * Helper which remove all the relations
   * of a specific model
   *
   * @param originalModelAlias
   * @param originalModelId
   * @param relationModel
   * @param {number|string}relationId
   *
   * @return {Function|promise}
   */

  removeRelationsIn: function removeRelationsIn(originalModelAlias, originalModelId, relationModel, relationId) {
    return new Promise(function (resolve, reject) {
      // Params object used for the `find` function.
      const findParams = {};
      findParams[relationModel] = relationId;
      findParams.id = {
        '!': originalModelId
      };

      // Find all the matching entries of the original model.
      strapi.orm.collections[originalModelAlias]
        .find(findParams)
        .exec(function (err, records) {
          if (err) {
            return reject(err);
          }

          // Init the array of promises.
          const savePromises = [];

          _.forEach(records, function (record) {

            // Set the relation to null
            if (record[relationModel]) {
              record[relationModel] = null;
            }

            // Save the entry and add the promise in the array
            savePromises.push(record.save());
          });

          Promise.all(savePromises)
            .then(function () {
              resolve();
            })
            .catch(function (err) {
              reject(err);
            });
        });
    });
  }
};
