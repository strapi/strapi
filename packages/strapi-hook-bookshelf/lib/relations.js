'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');

// Utils
const { models: { getValuePrimaryKey } } = require('strapi-utils');

const transformToArrayID = (array, association) => {
  if(_.isArray(array)) {
    array = array.map(value => {
      if (_.isPlainObject(value)) {
        return value._id || value.id || false;
      }

      return value;
    });

    return array.filter(n => n);
  }

  if (association.type === 'model' || (association.type === 'collection' && _.isObject(array))) {
    return _.isEmpty(_.toString(array)) ? [] : transformToArrayID([array]);
  }

  return [];
};

const getModel = (model, plugin) => {
  return _.get(strapi.plugins, [plugin, 'models', model]) || _.get(strapi, ['models', model]) || undefined;
};

const removeUndefinedKeys = obj => _.pickBy(obj, _.negate(_.isUndefined));

module.exports = {
  findOne: async function (params, populate) {
    const record = await this
      .forge({
        [this.primaryKey]: getValuePrimaryKey(params, this.primaryKey)
      })
      .fetch({
        withRelated: populate || this.associations.map(x => x.alias)
      });

    const data = record ? record.toJSON() : record;

    // Retrieve data manually.
    if (_.isEmpty(populate)) {
      const arrayOfPromises = this.associations
        .filter(association => ['manyMorphToOne', 'manyMorphToMany'].includes(association.nature))
        .map(() => {
          return this.morph.forge()
            .where({
              [`${this.collectionName}_id`]: getValuePrimaryKey(params, this.primaryKey)
            })
            .fetchAll();
        });

      const related = await Promise.all(arrayOfPromises);

      related.forEach((value, index) => {
        data[this.associations[index].alias] = value ? value.toJSON() : value;
      });
    }

    return data;
  },

  update: async function (params) {
    const relationUpdates = [];
    const primaryKeyValue = getValuePrimaryKey(params, this.primaryKey);
    const response = await module.exports.findOne.call(this, params);

    // Only update fields which are on this document.
    const values = params.parseRelationships === false ? params.values : Object.keys(removeUndefinedKeys(params.values)).reduce((acc, current) => {
      const property = params.values[current];
      const association = this.associations.filter(x => x.alias === current)[0];
      const details = this._attributes[current];

      if (!association && _.get(details, 'isVirtual') !== true) {
        return _.set(acc, current, property);
      }

      const assocModel = getModel(details.model || details.collection, details.plugin);
      switch (association.nature) {
        case 'oneWay': {
          return _.set(acc, current, _.get(property, assocModel.primaryKey, property));
        }
        case 'oneToOne': {
          if (response[current] === property) return acc;

          if (_.isNull(property)) {
            const updatePromise = assocModel.where({
              [assocModel.primaryKey]: getValuePrimaryKey(response[current], assocModel.primaryKey)
            }).save({ [details.via]: null }, {method: 'update', patch: true, require: false});

            relationUpdates.push(updatePromise);
            return _.set(acc, current, null);
          }


          // set old relations to null
          const updateLink = this.where({ [current]: property })
            .save({ [current]: null }, {method: 'update', patch: true, require: false})
            .then(() => {
              return assocModel
                .where({ [this.primaryKey]: property })
                .save({ [details.via] : primaryKeyValue}, {method: 'update', patch: true, require: false});
            });

          // set new relation
          relationUpdates.push(updateLink);
          return _.set(acc, current, property);
        }
        case 'oneToMany': {
          // receive array of ids or array of objects with ids

          // set relation to null for all the ids not in the list
          const currentIds = response[current];
          const toRemove = _.differenceWith(currentIds, property, (a, b) => {
            return `${a[assocModel.primaryKey] || a}` === `${b[assocModel.primaryKey] || b}`;
          });

          const updatePromise = assocModel
            .where(assocModel.primaryKey, 'in', toRemove.map(val => val[assocModel.primaryKey]||val))
            .save({ [details.via] : null }, { method: 'update', patch: true, require: false })
            .then(() => {
              return assocModel
                .where(assocModel.primaryKey, 'in', property.map(val => val[assocModel.primaryKey]||val))
                .save({ [details.via] : primaryKeyValue }, { method: 'update', patch: true, require: false });
            });

          relationUpdates.push(updatePromise);
          return acc;
        }
        case 'manyToOne': {
          return _.set(acc, current, _.get(property, assocModel.primaryKey, property));
        }
        case 'manyToMany': {
          const currentValue = transformToArrayID(response[current], association).map(id => id.toString());
          const storedValue = transformToArrayID(params.values[current], association).map(id => id.toString());

          const toAdd = _.difference(storedValue, currentValue);
          const toRemove = _.difference(currentValue, storedValue);

          const collection = this.forge({ [this.primaryKey]: primaryKeyValue })[association.alias]();
          const updatePromise = collection
            .detach(toRemove)
            .then(() => collection.attach(toAdd));

          relationUpdates.push(updatePromise);
          return acc;
        }
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
              relationUpdates.push(
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
              relationUpdates.push(module.exports.addRelationMorph.call(this, {
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
        case 'manyToManyMorph': {
          // Compare array of ID to find deleted files.
          const currentValue = transformToArrayID(response[current], association).map(id => id.toString());
          const storedValue = transformToArrayID(params.values[current], association).map(id => id.toString());

          const toAdd = _.difference(storedValue, currentValue);
          const toRemove = _.difference(currentValue, storedValue);

          const model = getModel(details.collection || details.model, details.plugin);

          toAdd.forEach(id => {
            relationUpdates.push(
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
            relationUpdates.push(
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
        }
        case 'oneMorphToOne':
        case 'oneMorphToMany':
          break;
        default:
      }

      return acc;
    }, {});

    if (!_.isEmpty(values)) {
      relationUpdates.push(
        this
          .forge({
            [this.primaryKey]: getValuePrimaryKey(params, this.primaryKey)
          })
          .save(values, {
            patch: true
          })
      );
    } else {
      relationUpdates.push(Promise.resolve(_.assign(response, params.values)));
    }

    // Update virtuals fields.
    await Promise.all(relationUpdates);

    return await this
      .forge({
        [this.primaryKey]: getValuePrimaryKey(params, this.primaryKey)
      })
      .fetch({
        withRelated: this.associations.map(x => x.alias)
      });
  },

  addRelation: async function (params) {
    const association = this.associations.find(x => x.via === params.foreignKey && _.get(params.values, x.alias, null));

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
    const association = this.associations.find(x => x.via === params.foreignKey && _.get(params.values, x.alias, null));

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
          [this.primaryKey]: getValuePrimaryKey(params, this.primaryKey)
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
      }, _.isUndefined))
      .destroy({
        require: false
      });
  }
};
