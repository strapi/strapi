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

    const entry = await this.findOne({ [this.primaryKey]: primaryKeyValue })
      .populate(populate)
      .lean();

    // Only update fields which are on this document.
    const values =
      params.parseRelationships === false
        ? params.values
        : Object.keys(removeUndefinedKeys(params.values)).reduce(
            (acc, attribute) => {
              const currentValue = entry[attribute];
              const newValue = params.values[attribute];

              const association = this.associations.find(
                x => x.alias === attribute
              );

              const details = this._attributes[attribute];

              // set simple attributes
              if (!association && _.get(details, 'isVirtual') !== true) {
                return _.set(acc, attribute, newValue);
              }

              const assocModel = getModel(
                details.model || details.collection,
                details.plugin
              );

              switch (association.nature) {
                case 'oneWay': {
                  return _.set(
                    acc,
                    attribute,
                    _.get(newValue, assocModel.primaryKey, newValue)
                  );
                }
                case 'oneToOne': {
                  // if value is the same don't do anything
                  if (currentValue === newValue) return acc;

                  // if the value is null, set field to null on both sides
                  if (_.isNull(newValue)) {
                    const updatePromise = assocModel.updateOne(
                      {
                        [assocModel.primaryKey]: getValuePrimaryKey(
                          currentValue,
                          assocModel.primaryKey
                        ),
                      },
                      { [details.via]: null }
                    );

                    relationUpdates.push(updatePromise);
                    return _.set(acc, attribute, null);
                  }

                  // set old relations to null
                  const updateLink = this.updateOne(
                    { [attribute]: new mongoose.Types.ObjectId(newValue) },
                    { [attribute]: null }
                  ).then(() => {
                    return assocModel.updateOne(
                      {
                        [this.primaryKey]: new mongoose.Types.ObjectId(
                          newValue
                        ),
                      },
                      { [details.via]: primaryKeyValue }
                    );
                  });

                  // set new relation
                  relationUpdates.push(updateLink);
                  return _.set(acc, attribute, newValue);
                }
                case 'oneToMany': {
                  // set relation to null for all the ids not in the list
                  const attributeIds = currentValue;
                  const toRemove = _.differenceWith(
                    attributeIds,
                    newValue,
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
                            $in: newValue.map(
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
                    attribute,
                    _.get(newValue, assocModel.primaryKey, newValue)
                  );
                }
                case 'manyWay':
                case 'manyToMany': {
                  if (association.dominant) {
                    return _.set(
                      acc,
                      attribute,
                      newValue
                        ? newValue.map(val => val[assocModel.primaryKey] || val)
                        : newValue
                    );
                  }

                  const updatePomise = assocModel
                    .updateMany(
                      {
                        [assocModel.primaryKey]: {
                          $in: currentValue.map(
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
                            $in: newValue
                              ? newValue.map(
                                  val =>
                                    new mongoose.Types.ObjectId(
                                      val[assocModel.primaryKey] || val
                                    )
                                )
                              : newValue,
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

                  newValue.forEach(obj => {
                    const refModel = strapi.getModel(obj.ref, obj.source);

                    const createRelation = () => {
                      return module.exports.addRelationMorph.call(this, {
                        id: entry[this.primaryKey],
                        alias: association.alias,
                        ref: obj.kind || refModel.globalId,
                        refId: new mongoose.Types.ObjectId(obj.refId),
                        field: obj.field,
                        filter: association.filter,
                      });
                    };

                    // Clear relations to refModel
                    const reverseAssoc = refModel.associations.find(
                      assoc => assoc.alias === obj.field
                    );
                    if (
                      reverseAssoc &&
                      reverseAssoc.nature === 'oneToManyMorph'
                    ) {
                      relationUpdates.push(
                        module.exports.removeRelationMorph
                          .call(this, {
                            alias: association.alias,
                            ref: obj.kind || refModel.globalId,
                            refId: new mongoose.Types.ObjectId(obj.refId),
                            field: obj.field,
                            filter: association.filter,
                          })
                          .then(createRelation)
                      );
                    } else {
                      relationUpdates.push(createRelation());
                    }
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
                  const attributeValue = transformToArrayID(currentValue).map(
                    id => id.toString()
                  );
                  const storedValue = transformToArrayID(newValue).map(id =>
                    id.toString()
                  );

                  const toAdd = _.difference(storedValue, attributeValue);
                  const toRemove = _.difference(attributeValue, storedValue);

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
                        refId: entry._id,
                        field: association.alias,
                        filter: association.filter,
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
                        refId: entry._id,
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

  async addRelationMorph(params) {
    const { alias, id } = params;

    let entry = await this.findOne({
      [this.primaryKey]: id,
    });

    if (!entry) return Promise.resolve();

    // if association already exists ignore
    const relationExists = entry[alias].find(obj => {
      if (
        obj.kind === params.ref &&
        obj.ref.toString() === params.refId.toString() &&
        obj.field === params.field
      ) {
        return true;
      }

      return false;
    });

    if (relationExists) return Promise.resolve();

    entry[alias].push({
      ref: new mongoose.Types.ObjectId(params.refId),
      kind: params.ref,
      [params.filter]: params.field,
    });

    await entry.save();
  },

  async removeRelationMorph(params) {
    const { alias } = params;

    let opts;
    // if entry id is provided simply query it
    if (params.id) {
      opts = {
        _id: params.id,
      };
    } else {
      opts = {
        [alias]: {
          $elemMatch: {
            ref: params.refId,
            kind: params.ref,
            [params.filter]: params.field,
          },
        },
      };
    }

    const entries = await this.find(opts);

    const updates = entries.map(entry => {
      entry[alias] = entry[alias].filter(obj => {
        if (
          obj.kind === params.ref &&
          obj.ref.toString() === params.refId.toString() &&
          obj.field === params.field
        ) {
          return false;
        }

        return true;
      });

      return entry.save();
    });

    await Promise.all(updates);
  },
};
