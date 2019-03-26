/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');
const mongoose = require('mongoose');
const util = require('util');

// Utils
const { models: { getValuePrimaryKey } } = require('strapi-utils');

const getModel = function (model, plugin) {
  return _.get(strapi.plugins, [plugin, 'models', model]) || _.get(strapi, ['models', model]) || undefined;
};

module.exports = {


  update: async function (params) {
    const relationUpdates = [];
    const populate = this.associations.map(x => x.alias).join(' ');
    const primaryKeyValue = getValuePrimaryKey(params, this.primaryKey);

    const response = await this
      .findOne({
        [this.primaryKey]: primaryKeyValue
      })
      .populate(populate)
      .lean();

    // Only update fields which are on this document.
    const values = params.parseRelationships === false ? params.values : Object.keys(params.values).reduce((acc, current) => {
      const property = params.values[current];
      const association = this.associations.find(x => x.alias === current);
      const details = this._attributes[current];

      // set simple attributes
      if (!association && _.get(details, 'isVirtual') !== true) {
        return _.set(acc, current, property);
      }

      const assocModel = getModel(details.model || details.collection, details.plugin);
      switch (association.nature) {
        case 'oneWay': {
          return _.set(acc, current, _.get(property, assocModel.primaryKey, property));
        }
        case 'oneToOne': {
          // if value is the same don't do anything
          if (response[current] === property) return acc;

          // if the value is null, set field to null on both sides
          if (_.isNull(property)) {
            const updatePromise = assocModel.updateOne({
              [assocModel.primaryKey]: getValuePrimaryKey(response[current], assocModel.primaryKey)
            }, { [details.via]: null })

            relationUpdates.push(updatePromise)
            return _.set(acc, current, null);
          }

          // set old relations to null
          const updateLink = this.updateOne({
            [current]: new mongoose.Types.ObjectId(property)
          }, { [current]: null })
          .then(() => {
            return assocModel.updateOne({
              [this.primaryKey]: new mongoose.Types.ObjectId(property)
            }, { [details.via] : primaryKeyValue})
          })

          // set new relation
          relationUpdates.push(updateLink);
          return _.set(acc, current, property);
        }
        case 'oneToMany': {
          // receive array of ids or array of objects with ids

          // set relation to null for all the ids not in the list
          const currentIds = response[current];
          const diff = _.differenceWith(property, currentIds, (a, b) => {
            `${a[assocModel.primaryKey] || a}` === `${b[assocModel.primaryKey] || b}`
          })

          const updatePromise = assocModel.updateMany({
            [assocModel.primaryKey]: {
              $in: currentIds.map(val => new mongoose.Types.ObjectId(val[assocModel.primaryKey]||val))
            }
          }, { [details.via] : null })
          .then(() => {
            return assocModel.updateMany({
              [assocModel.primaryKey]: {
                $in: diff.map(val => new mongoose.Types.ObjectId(val[assocModel.primaryKey]||val))
              }
            }, { [details.via] : primaryKeyValue })
          })

          relationUpdates.push(updatePromise)
          return acc;
        }
        case 'manyToOne': {
          return _.set(acc, current, _.get(property, assocModel.primaryKey, property));
        }
        case 'manyToMany': {

          if (details.dominant) {
            return _.set(acc, current, property.map(val => val[assocModel.primaryKey] || val));
          }

          const updatePomise = assocModel.updateMany({
            [assocModel.primaryKey]: {
              $in: response[current].map(val => new mongoose.Types.ObjectId(val[assocModel.primaryKey] || val))
            }
          }, {
            $pull: { [association.via]: new mongoose.Types.ObjectId(primaryKeyValue) }
          })
          .then(() => {
            return assocModel.updateMany({
              [assocModel.primaryKey]: {
                $in: property.map(val => new mongoose.Types.ObjectId(val[assocModel.primaryKey] || val))
              }
            }, {
              $addToSet: { [association.via]: [primaryKeyValue] }
            })
          })

          relationUpdates.push(updatePomise);
          return acc;


          // TODO: handle concat or remove from current
          if (association.nature === 'manyToMany' && details.dominant === true) {
            return _.set(acc, current, property);
          }

          if (response[current] && _.isArray(response[current]) && current !== 'id') {
            // Records to add in the relation.
            const toAdd = _.differenceWith(property, response[current], (a, b) =>
              (a[this.primaryKey] || a).toString() === (b[this.primaryKey] || b).toString()
            );

            // Records to remove in the relation.
            const toRemove = _.differenceWith(response[current], property, (a, b) =>
              (a[this.primaryKey] || a).toString() === (b[this.primaryKey] || b).toString()
            )
              .filter(x => toAdd.find(y => x.id === y.id) === undefined);

            const model = getModel(details.model || details.collection, details.plugin);

            // Push the work into the flow process.
            toAdd.forEach(value => {
              value = _.isString(value) ? { [this.primaryKey]: value } : value;

              if (association.nature === 'manyToMany' && !_.isArray(params.values[this.primaryKey] || params[this.primaryKey])) {
                value[details.via] = (value[details.via] || [])
                  .concat([(params.values[this.primaryKey] || params[this.primaryKey])])
                  .filter(x => {
                    return x !== null && x !== undefined;
                  });
              } else {
                value[details.via] = getValuePrimaryKey(params, this.primaryKey);
              }

              relationUpdates.push(
                module.exports.addRelation.call(model, {
                  id: getValuePrimaryKey(value, this.primaryKey),
                  values: _.pick(value, [this.primaryKey, details.via]),
                  foreignKey: current
                })
              );
            });

            toRemove.forEach(value => {
              value = _.isString(value) ? { [this.primaryKey]: value } : value;

              if (association.nature === 'manyToMany' && !_.isArray(params.values[this.primaryKey] || params[this.primaryKey])) {
                value[details.via] = value[details.via].filter(x => _.toString(x) !== _.toString(params.values[this.primaryKey] || params[this.primaryKey]));
              } else {
                value[details.via] = null;
              }

              relationUpdates.push(
                module.exports.removeRelation.call(model, {
                  id: getValuePrimaryKey(value, this.primaryKey),
                  values: _.pick(value, [this.primaryKey, details.via]),
                  foreignKey: current
                })
              );
            });

            return acc;
          }
        }
        case 'manyMorphToMany':
        case 'manyMorphToOne':
          // Update the relational array.
          acc[current] = property.map(obj => {
            const globalId = obj.source && obj.source !== 'content-manager' ?
              strapi.plugins[obj.source].models[_.toLower(obj.ref)].globalId:
              strapi.models[_.toLower(obj.ref)].globalId;

            // Define the object stored in database.
            // The shape is this object is defined by the strapi-hook-mongoose connector.
            return {
              ref: obj.refId,
              kind: globalId,
              [association.filter]: obj.field
            };
          });
          break;
        case 'oneToManyMorph':
        case 'manyToManyMorph': {
          const transformToArrayID = (array) => {
            if (_.isArray(array)) {
              return array.map(value => {
                if (_.isPlainObject(value)) {
                  return getValuePrimaryKey(value, this.primaryKey);
                }

                return value;
              });
            }

            if (association.type === 'model' || (association.type === 'collection' && _.isObject(array))) {
              return _.isEmpty(array) ? [] : transformToArrayID([array]);
            }

            return [];
          };

          // Compare array of ID to find deleted files.
          const currentValue = transformToArrayID(response[current]).map(id => id.toString());
          const storedValue = transformToArrayID(property).map(id => id.toString());

          const toAdd = _.difference(storedValue, currentValue);
          const toRemove = _.difference(currentValue, storedValue);

          const model = getModel(details.model || details.collection, details.plugin);

          // Remove relations in the other side.
          toAdd.forEach(id => {
            relationUpdates.push(
              module.exports.addRelationMorph.call(model, {
                id,
                alias: association.via,
                ref: this.globalId,
                refId: response._id,
                field: association.alias
              })
            );
          });

          // Remove relations in the other side.
          toRemove.forEach(id => {
            relationUpdates.push(
              module.exports.removeRelationMorph.call(model, {
                id,
                alias: association.via,
                ref: this.globalId,
                refId: response._id,
                field: association.alias
              })
            );
          });
          break;
        }
        case 'oneMorphToOne':
        case 'oneMorphToMany':
          break;
        default:
      }


      return acc;
    }, {});


    // Update virtuals fields.
    await Promise.all(relationUpdates)
      .then(() => this.updateOne({ [this.primaryKey]: primaryKeyValue }, values, { strict: false}));

    const updatedEntity = await this
      .findOne({
        [this.primaryKey]: primaryKeyValue
      })
      .populate(populate);

    return updatedEntity;
  },

  addRelation: async function (params) {
    return module.exports.update.call(this, params);
  },

  removeRelation: async function (params) {
    return module.exports.update.call(this, params);
  },

  addRelationMorph: async function (params) {
    /*
      TODO:
      Test this part because it has been coded during the development of the upload feature.
      However the upload doesn't need this method. It only uses the `removeRelationMorph`.
    */

    let entry = (
      await this
        .findOne({
          [this.primaryKey]: getValuePrimaryKey(params, this.primaryKey)
        })
    );

    if (entry) {
      entry = entry.toJSON();
    }

    const value = [];

    // Retrieve association.
    const association = this.associations.find(association => association.alias === params.alias);

    if (!association) {
      throw Error(`Impossible to create relationship with ${params.ref} (${params.refId})`);
    }

    // Resolve if the association is already existing.
    const isExisting = value.find(obj => {
      if (obj.kind === params.ref && obj.ref.toString() === params.refId.toString() && obj.field === params.field) {
        return true;
      }

      return false;
    });

    // Avoid duplicate.
    if (isExisting) {
      return Promise.resolve();
    }

    // Push new relation to the association array.
    value.push({
      ref: params.ref,
      refId: params.refId,
      kind: params.ref,
      field: params.field
    });

    entry[params.alias] = value;

    return module.exports.update.call(this, {
      id: params.id,
      values: entry
    });
  },

  removeRelationMorph: async function (params) {
    const entry = await this.findOne({
      [this.primaryKey]: getValuePrimaryKey(params, this.primaryKey)
    });

    // Filter the association array and remove the association.
    entry[params.alias] = entry[params.alias].filter(obj => {
      if (obj.kind === params.ref && obj.ref.toString() === params.refId.toString() && obj.field === params.field) {
        return false;
      }

      return true;
    });

    return module.exports.update.call(this, {
      id: params.id,
      values: entry
    });
  }
};
