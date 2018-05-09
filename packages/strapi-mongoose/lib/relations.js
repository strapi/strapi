'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');

module.exports = {
  getModel: function (model, plugin) {
    return _.get(strapi.plugins, [plugin, 'models', model]) || get(strapi, ['models', model]) || undefined;
  },

  update: async function (params) {
    const virtualFields = [];
    const response = await this
      .findOne({
        [this.primaryKey]: params[this.primaryKey] || params.id
      })
      .populate(this.associations.map(x => x.alias).join(' '));

    // Only update fields which are on this document.
    const values = params.parseRelationships === false ? params.values : Object.keys(JSON.parse(JSON.stringify(params.values))).reduce((acc, current) => {
      const association = this.associations.filter(x => x.alias === current)[0];
      const details = this._attributes[current];

      if (_.get(this._attributes, `${current}.isVirtual`) !== true && _.isUndefined(association)) {
        acc[current] = params.values[current];
      } else {
        switch (association.nature) {
          case 'oneWay':
            acc[current] = _.get(params.values[current], this.primaryKey, params.values[current]) || null;

            break;
          case 'oneToOne':
            if (response[current] !== params.values[current]) {
              const value = _.isNull(params.values[current]) ? response[current] : params.values;
              const recordId = _.isNull(params.values[current]) ? value[this.primaryKey] || value.id || value._id : value[current];

              const model = module.exports.getModel(details.model || details.collection, details.plugin);

              if (response[current] && _.isObject(response[current]) && response[current][this.primaryKey] !== value[current]) {
                virtualFields.push(
                  module.exports.update.call(model, {
                    id: response[current][this.primaryKey],
                    values: {
                      [details.via]: null
                    },
                    parseRelationships: false
                  })
                );
              }

              // Remove previous relationship asynchronously if it exists.
              virtualFields.push(
                model
                  .findOne({ [model.primaryKey] : recordId })
                  .populate(details.via)
                  .then(record => {
                    if (record && _.isObject(record[details.via])) {
                      virtualFields.push(
                        module.exports.update.call(model, {
                          id: record[details.via][this.primaryKey] || record[details.via].id,
                          values: {
                            [current]: null
                          },
                          parseRelationships: false
                        })
                      );
                    }

                    return Promise.resolve();
                  })
                  .then(response => {
                    // Updating the new relations
                    // When params.values[current] is null this means that we are removing the relation.
                    // Recreate relation on the first side
                    virtualFields.push(
                      module.exports.update.call(model, {
                        id: recordId,
                        values: {
                          [details.via]: params[this.primaryKey] || params.id || null
                        },
                        parseRelationships: false
                      })
                    );

                    // Recreate relation on the other side if the value is not null
                    if (!_.isNull(params.values[current])) {
                      virtualFields.push(
                        module.exports.update.call(this, {
                          id: value[this.primaryKey] || value.id || null,
                          values: {
                            [current]: recordId
                          },
                          parseRelationships: false
                        })
                      );
                    }
                  })
              );

              acc[current] = _.isNull(params.values[current]) ? null : value[current];
            }

            break;
          case 'oneToMany':
          case 'manyToOne':
          case 'manyToMany':
            if (association.nature === 'manyToMany' && details.dominant === true) {
              acc[current] = params.values[current];
            } else if (response[current] && _.isArray(response[current]) && current !== 'id') {
              // Records to add in the relation.
              const toAdd = _.differenceWith(params.values[current], response[current], (a, b) =>
                a[this.primaryKey].toString() === b[this.primaryKey].toString()
              );

              // Records to remove in the relation.
              const toRemove = _.differenceWith(response[current], params.values[current], (a, b) =>
                a[this.primaryKey].toString() === b[this.primaryKey].toString()
              )
                .filter(x => toAdd.find(y => x.id === y.id) === undefined);

              const model = module.exports.getModel(details.model || details.collection, details.plugin);

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
                  value[details.via] = params[this.primaryKey] || params.id;
                }

                virtualFields.push(
                  module.exports.addRelation.call(model, {
                    id: value[this.primaryKey] || value.id || value._id,
                    values: _.pick(value, [this.primaryKey, details.via]),
                    foreignKey: current
                  })
                );
              });

              toRemove.forEach(value => {
                value = _.isString(value) ? { [this.primaryKey]: value } : value;

                if (association.nature === 'manyToMany' && !_.isArray(params.values[this.primaryKey])) {
                  value[details.via] = value[details.via].filter(x => x.toString() !== params.values[this.primaryKey].toString());
                } else {
                  value[details.via] = null;
                }

                virtualFields.push(
                  module.exports.removeRelation.call(model, {
                    id: value[this.primaryKey] || value.id || value._id,
                    values: _.pick(value, [this.primaryKey, details.via]),
                    foreignKey: current
                  })
                );
              });
            } else if (_.get(this._attributes, `${current}.isVirtual`) !== true) {
              acc[current] = params.values[current];
            }

            break;
          case 'manyMorphToMany':
          case 'manyMorphToOne':
            // Update the relational array.
            acc[current] = params.values[current].map(obj => {
              const globalId = obj.source && obj.source !== 'content-manager' ?
                strapi.plugins[obj.source].models[_.toLower(obj.ref)].globalId:
                strapi.models[_.toLower(obj.ref)].globalId;

              // Define the object stored in database.
              // The shape is this object is defined by the strapi-mongoose connector.
              return {
                ref: obj.refId,
                kind: globalId,
                [association.filter]: obj.field
              }
            });
            break;
          case 'oneToManyMorph':
          case 'manyToManyMorph':
            const transformToArrayID = (array) => {
              if (_.isArray(array)) {
                return array.map(value => {
                  if (_.isPlainObject(value)) {
                    return value._id || value.id;
                  }

                  return value;
                })
              }

              if (association.type === 'model' || (association.type === 'collection' && _.isObject(array))) {
                return _.isEmpty(array) ? [] : transformToArrayID([array]);
              }

              return [];
            };

            // Compare array of ID to find deleted files.
            const currentValue = transformToArrayID(response[current]).map(id => id.toString());
            const storedValue = transformToArrayID(params.values[current]).map(id => id.toString());

            const toAdd = _.difference(storedValue, currentValue);
            const toRemove = _.difference(currentValue, storedValue);

            const model = module.exports.getModel(details.model || details.collection, details.plugin);

            // Remove relations in the other side.
            toAdd.forEach(id => {
              virtualFields.push(
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
              virtualFields.push(
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
          case 'oneMorphToOne':
          case 'oneMorphToMany':
            break;
          default:
        }
      }

      return acc;
    }, {});

    virtualFields.push(
      this
        .update({
          [this.primaryKey]: params[this.primaryKey] || params.id
        }, values, {
          strict: false
        })
    );

    // Update virtuals fields.
    await Promise.all(virtualFields);

    return await this
      .findOne({
        [this.primaryKey]: params[this.primaryKey] || params.id
      })
      .populate(this.associations.map(x => x.alias).join(' '));
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

    const entry = (
      await this
        .findOne({
          [this.primaryKey]: params[this.primaryKey] || params.id
        })
        .toJSON()
    );
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
      [this.primaryKey]: params[this.primaryKey] || params.id
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
}
