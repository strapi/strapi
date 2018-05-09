'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');

const transformToArrayID = (array) => {
  if(_.isArray(array)) {
    return array.map(value => {
      if (_.isPlainObject(value)) {
        return value._id || value.id;
      }

      return value;
    })
  }

  if (association.type === 'model' || (association.type === 'collection' && _.isObject(array))) {
    return _.isEmpty(_.toString(array)) ? [] : transformToArrayID([array]);
  }

  return [];
};

module.exports = {
  getModel: function (model, plugin) {
    return _.get(strapi.plugins, [plugin, 'models', model]) || _.get(strapi, ['models', model]) || undefined;
  },

  findOne: async function (params, populate, raw = true) {
    const record = await this
      .forge({
        [this.primaryKey]: params[this.primaryKey]
      })
      .fetch({
        withRelated: populate || this.associations.map(x => x.alias)
      });

    const data = record ? record.toJSON() : record;

    // Retrieve data manually.
    if (_.isEmpty(populate)) {
      const arrayOfPromises = this.associations
        .filter(association => ['manyMorphToOne', 'manyMorphToMany'].includes(association.nature))
        .map(association => {
          return this.morph.forge()
            .where({
              [`${this.collectionName}_id`]: params[this.primaryKey]
            })
            .fetchAll()
        });

      const related = await Promise.all(arrayOfPromises);

      related.forEach((value, index) => {
        data[this.associations[index].alias] = value ? value.toJSON() : value;
      });
    }

    return data;
  },

  update: async function (params) {
    const virtualFields = [];
    const response = await module.exports.findOne.call(this, params);

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

              const model = module.exports.getModel(details.collection || details.model, details.plugin);

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
                module.exports.findOne.call(model, { id : recordId })
                  .then(record => {
                    if (record && _.isObject(record[details.via]) && record[details.via][current] !== value[current]) {
                      return module.exports.update.call(this, {
                        id: record[details.via][this.primaryKey] || record[details.via].id,
                        values: {
                          [current]: null
                        },
                        parseRelationships: false
                      });
                    }

                    return Promise.resolve();
                  })
              );

              // Update the record on the other side.
              // When params.values[current] is null this means that we are removing the relation.
              virtualFields.push(
                module.exports.update.call(model, {
                  id: recordId,
                  values: {
                    [details.via]: _.isNull(params.values[current]) ? null : value[this.primaryKey] || value.id || value._id
                  },
                  parseRelationships: false
                })
              );

              acc[current] = _.isNull(params.values[current]) ? null : value[current];
            }

            break;
          case 'oneToMany':
          case 'manyToOne':
          case 'manyToMany':
            if (response[current] && _.isArray(response[current]) && current !== 'id') {
              // Compare array of ID to find deleted files.
              const currentValue = transformToArrayID(response[current]).map(id => id.toString());
              const storedValue = transformToArrayID(params.values[current]).map(id => id.toString());

              const toAdd = _.difference(storedValue, currentValue);
              const toRemove = _.difference(currentValue, storedValue);

              const model = module.exports.getModel(details.collection || details.model, details.plugin);

              // Push the work into the flow process.
              toAdd.forEach(value => {
                value = _.isString(value) || _.isNumber(value) ? { [this.primaryKey]: value } : value;

                value[details.via] = params.values[this.primaryKey] || params[this.primaryKey];

                virtualFields.push(
                  module.exports.addRelation.call(model, {
                    id: value[this.primaryKey] || value.id || value._id,
                    values: value,
                    foreignKey: current
                  })
                );
              });

              toRemove.forEach(value => {
                value = _.isString(value) || _.isNumber(value) ? { [this.primaryKey]: value } : value;

                value[details.via] = association.nature !== 'manyToMany' ?
                  null :
                  params.values[this.primaryKey] || params[this.primaryKey];

                virtualFields.push(
                  module.exports.removeRelation.call(model, {
                    id: value[this.primaryKey] || value.id || value._id,
                    values: value,
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
            params.values[current].forEach(obj => {
              const model = obj.source && obj.source !== 'content-manager' ?
                strapi.plugins[obj.source].models[obj.ref]:
                strapi.models[obj.ref];

              // Remove existing relationship because only one file
              // can be related to this field.
              if (association.nature === 'manyMorphToOne') {
                virtualFields.push(
                  module.exports.removeRelationMorph.call(this, {
                    alias: association.alias,
                    ref: model.collectionName,
                    refId: obj.refId,
                    field: obj.field
                  })
                  .then(() =>
                    module.exports.addRelationMorph.call(this, {
                      id: response[this.primaryKey],
                      alias: association.alias,
                      ref: model.collectionName,
                      refId: obj.refId,
                      field: obj.field
                    })
                  )
                );
              } else {
                virtualFields.push(module.exports.addRelationMorph.call(this, {
                  id: response[this.primaryKey],
                  alias: association.alias,
                  ref: model.collectionName,
                  refId: obj.refId,
                  field: obj.field
                }));
              }
            });
            break;
          case 'oneToManyMorph':
          case 'manyToManyMorph':
            // Compare array of ID to find deleted files.
            const currentValue = transformToArrayID(response[current]).map(id => id.toString());
            const storedValue = transformToArrayID(params.values[current]).map(id => id.toString());

            const toAdd = _.difference(storedValue, currentValue);
            const toRemove = _.difference(currentValue, storedValue);

            const model = module.exports.getModel(details.collection || details.model, details.plugin);

            toAdd.forEach(id => {
              virtualFields.push(
                module.exports.addRelationMorph.call(model, {
                  id,
                  alias: association.via,
                  ref: this.collectionName,
                  refId: response.id,
                  field: association.alias
                })
              );
            });

            // Update the relational array.
            toRemove.forEach(id => {
              virtualFields.push(
                module.exports.removeRelationMorph.call(model, {
                  id,
                  alias: association.via,
                  ref: this.collectionName,
                  refId: response.id,
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

    if (!_.isEmpty(values)) {
      virtualFields.push(
        this
          .forge({
            [this.primaryKey]: params[this.primaryKey]
          })
          .save(values, {
            patch: true
          })
      );
    } else {
      virtualFields.push(Promise.resolve(_.assign(response, params.values)));
    }

    // Update virtuals fields.
    await Promise.all(virtualFields);

    return await this
      .forge({
        [this.primaryKey]: params[this.primaryKey] || params.id
      })
      .fetch({
        withRelated: this.associations.map(x => x.alias)
      });
  },

  addRelation: async function (params) {
    const association = this.associations.filter(x => x.via === params.foreignKey)[0];

    if (!association) {
      // Resolve silently.
      return Promise.resolve();
    }

    switch (association.nature) {
      case 'oneToOne':
      case 'oneToMany':
      case 'manyToOne':
        return module.exports.update.call(this, params);
      case 'manyToMany':
        return this.forge({
          [this.primaryKey]: params[this.primaryKey]
        })[association.alias]().attach(params.values[association.alias]);
      default:
        // Resolve silently.
        return Promise.resolve();
    }
  },

  removeRelation: async function (params) {
    const association = this.associations.filter(x => x.via === params.foreignKey)[0];

    if (!association) {
      // Resolve silently.
      return Promise.resolve();
    }

    switch (association.nature) {
      case 'oneToOne':
      case 'oneToMany':
      case 'manyToOne':
        return module.exports.update.call(this, params);
      case 'manyToMany':
        return this.forge({
          [this.primaryKey]: params[this.primaryKey]
        })[association.alias]().detach(params.values[association.alias]);
      default:
        // Resolve silently.
        return Promise.resolve();
    }
  },

  addRelationMorph: async function (params) {
    const record = await this.morph.forge()
      .where({
        [`${this.collectionName}_id`]: params.id,
        [`${params.alias}_id`]: params.refId,
        [`${params.alias}_type`]: params.ref,
        field: params.field
      })
      .fetch({
        withRelated: this.associations.map(x => x.alias)
      });

    const entry = record ? record.toJSON() : record;

    if (entry) {
      return Promise.resolve();
    }

    return await this.morph.forge({
        [`${this.collectionName}_id`]: params.id,
        [`${params.alias}_id`]: params.refId,
        [`${params.alias}_type`]: params.ref,
        field: params.field
      })
      .save();
  },

  removeRelationMorph: async function (params) {
    return await this.morph.forge()
      .where(_.omitBy({
        [`${this.collectionName}_id`]: params.id,
        [`${params.alias}_id`]: params.refId,
        [`${params.alias}_type`]: params.ref,
        field: params.field
      }, _.isEmpty))
      .destroy();
  }
}
