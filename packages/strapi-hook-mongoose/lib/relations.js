/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');
const mongoose = require('mongoose');

// Utils
const {
  models: { getValuePrimaryKey },
} = require('strapi-utils');

const getModel = function(model, plugin) {
  return (
    _.get(strapi.plugins, [plugin, 'models', model]) ||
    _.get(strapi, ['models', model]) ||
    undefined
  );
};

const removeUndefinedKeys = obj => _.pickBy(obj, _.negate(_.isUndefined));

module.exports = {
  update: async function(params) {
    const relationUpdates = [];
    const populate = this.associations.map(x => x.alias);
    const primaryKeyValue = getValuePrimaryKey(params, this.primaryKey);

    const response = await this.findOne({ [this.primaryKey]: primaryKeyValue })
      .populate(populate)
      .lean();

    // Only update fields which are on this document.
    const values =
      params.parseRelationships === false
        ? params.values
        : Object.keys(removeUndefinedKeys(params.values)).reduce(
            (acc, current) => {
              const property = params.values[current];
              const association = this.associations.find(
                x => x.alias === current
              );
              const details = this._attributes[current];

              // set simple attributes
              if (!association && _.get(details, 'isVirtual') !== true) {
                return _.set(acc, current, property);
              }

              const assocModel = getModel(
                details.model || details.collection,
                details.plugin
              );
              switch (association.nature) {
                case 'oneWay': {
                  return _.set(
                    acc,
                    current,
                    _.get(property, assocModel.primaryKey, property)
                  );
                }
                case 'oneToOne': {
                  // if value is the same don't do anything
                  if (response[current] === property) return acc;

                  // if the value is null, set field to null on both sides
                  if (_.isNull(property)) {
                    const updatePromise = assocModel.updateOne(
                      {
                        [assocModel.primaryKey]: getValuePrimaryKey(
                          response[current],
                          assocModel.primaryKey
                        ),
                      },
                      { [details.via]: null }
                    );

                    relationUpdates.push(updatePromise);
                    return _.set(acc, current, null);
                  }

                  // set old relations to null
                  const updateLink = this.updateOne(
                    { [current]: new mongoose.Types.ObjectId(property) },
                    { [current]: null }
                  ).then(() => {
                    return assocModel.updateOne(
                      {
                        [this.primaryKey]: new mongoose.Types.ObjectId(
                          property
                        ),
                      },
                      { [details.via]: primaryKeyValue }
                    );
                  });

                  // set new relation
                  relationUpdates.push(updateLink);
                  return _.set(acc, current, property);
                }
                case 'oneToMany': {
                  // set relation to null for all the ids not in the list
                  const currentIds = response[current];
                  const toRemove = _.differenceWith(
                    currentIds,
                    property,
                    (a, b) => {
                      return (
                        `${a[assocModel.primaryKey] || a}` ===
                        `${b[assocModel.primaryKey] || b}`
                      );
                    }
                  );

                  const updatePromise = assocModel
                    .updateMany(
                      {
                        [assocModel.primaryKey]: {
                          $in: toRemove.map(
                            val =>
                              new mongoose.Types.ObjectId(
                                val[assocModel.primaryKey] || val
                              )
                          ),
                        },
                      },
                      { [details.via]: null }
                    )
                    .then(() => {
                      return assocModel.updateMany(
                        {
                          [assocModel.primaryKey]: {
                            $in: property.map(
                              val =>
                                new mongoose.Types.ObjectId(
                                  val[assocModel.primaryKey] || val
                                )
                            ),
                          },
                        },
                        { [details.via]: primaryKeyValue }
                      );
                    });

                  relationUpdates.push(updatePromise);
                  return acc;
                }
                case 'manyToOne': {
                  return _.set(
                    acc,
                    current,
                    _.get(property, assocModel.primaryKey, property)
                  );
                }
                case 'manyWay':
                case 'manyToMany': {
                  if (association.dominant) {
                    return _.set(
                      acc,
                      current,
                      property
                        ? property.map(val => val[assocModel.primaryKey] || val)
                        : property
                    );
                  }

                  const updatePomise = assocModel
                    .updateMany(
                      {
                        [assocModel.primaryKey]: {
                          $in: response[current].map(
                            val =>
                              new mongoose.Types.ObjectId(
                                val[assocModel.primaryKey] || val
                              )
                          ),
                        },
                      },
                      {
                        $pull: {
                          [association.via]: new mongoose.Types.ObjectId(
                            primaryKeyValue
                          ),
                        },
                      }
                    )
                    .then(() => {
                      return assocModel.updateMany(
                        {
                          [assocModel.primaryKey]: {
                            $in: property
                              ? property.map(
                                  val =>
                                    new mongoose.Types.ObjectId(
                                      val[assocModel.primaryKey] || val
                                    )
                                )
                              : property,
                          },
                        },
                        {
                          $addToSet: { [association.via]: [primaryKeyValue] },
                        }
                      );
                    });

                  relationUpdates.push(updatePomise);
                  return acc;
                }
                case 'manyMorphToMany':
                case 'manyMorphToOne': {
                  // Update the relational array.
                  acc[current] = property.map(obj => {
                    const refModel = strapi.getModel(obj.ref, obj.source);
                    return {
                      ref: new mongoose.Types.ObjectId(obj.refId),
                      kind: obj.kind || refModel.globalId,
                      [association.filter]: obj.field,
                    };
                  });
                  break;
                }
                case 'oneToManyMorph':
                case 'manyToManyMorph': {
                  const transformToArrayID = array => {
                    if (_.isArray(array)) {
                      return array.map(value => {
                        if (_.isPlainObject(value)) {
                          return getValuePrimaryKey(value, this.primaryKey);
                        }

                        return value;
                      });
                    }

                    if (
                      association.type === 'model' ||
                      (association.type === 'collection' && _.isObject(array))
                    ) {
                      return _.isEmpty(array)
                        ? []
                        : transformToArrayID([array]);
                    }

                    return [];
                  };

                  // Compare array of ID to find deleted files.
                  const currentValue = transformToArrayID(
                    response[current]
                  ).map(id => id.toString());
                  const storedValue = transformToArrayID(property).map(id =>
                    id.toString()
                  );

                  const toAdd = _.difference(storedValue, currentValue);
                  const toRemove = _.difference(currentValue, storedValue);

                  const model = getModel(
                    details.model || details.collection,
                    details.plugin
                  );

                  // Remove relations in the other side.
                  toAdd.forEach(id => {
                    relationUpdates.push(
                      module.exports.addRelationMorph.call(model, {
                        id,
                        alias: association.via,
                        ref: this.globalId,
                        refId: response._id,
                        field: association.alias,
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
                        field: association.alias,
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
            },
            {}
          );

    // Update virtuals fields.
    await Promise.all(relationUpdates).then(() =>
      this.updateOne({ [this.primaryKey]: primaryKeyValue }, values, {
        strict: false,
      })
    );

    const updatedEntity = await this.findOne({
      [this.primaryKey]: primaryKeyValue,
    }).populate(populate);

    return updatedEntity && updatedEntity.toObject
      ? updatedEntity.toObject()
      : updatedEntity;
  },

  addRelationMorph: async function(params) {
    let entry = await this.findOne({
      [this.primaryKey]: getValuePrimaryKey(params, this.primaryKey),
    });

    if (entry) {
      entry = entry.toJSON();
    }

    const value = [];

    // Retrieve association.
    const association = this.associations.find(
      association => association.alias === params.alias
    );

    if (!association) {
      throw Error(
        `Impossible to create relationship with ${params.ref} (${params.refId})`
      );
    }

    // Resolve if the association is already existing.
    const isExisting = value.find(obj => {
      if (
        obj.kind === params.ref &&
        obj.ref.toString() === params.refId.toString() &&
        obj.field === params.field
      ) {
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
      field: params.field,
    });

    entry[params.alias] = value;

    return module.exports.update.call(this, {
      id: params.id,
      values: entry,
    });
  },

  removeRelationMorph: async function(params) {
    const entry = await this.findOne({
      [this.primaryKey]: getValuePrimaryKey(params, this.primaryKey),
    });

    // Filter the association array and remove the association.
    entry[params.alias] = entry[params.alias].filter(obj => {
      if (
        obj.kind === params.ref &&
        obj.ref.toString() === params.refId.toString() &&
        obj.field === params.field
      ) {
        return false;
      }

      return true;
    });

    return module.exports.update.call(this, {
      id: params.id,
      values: entry,
    });
  },
};
