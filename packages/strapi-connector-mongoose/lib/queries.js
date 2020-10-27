'use strict';
/**
 * Implementation of model queries for mongo
 */

const _ = require('lodash');
const { convertRestQueryParams, buildQuery } = require('strapi-utils');
const { contentTypes: contentTypesUtils } = require('strapi-utils');
const populateQueries = require('./utils/populate-queries');

const { PUBLISHED_AT_ATTRIBUTE, DP_PUB_STATES } = contentTypesUtils.constants;

const { findComponentByGlobalId } = require('./utils/helpers');

const hasPK = (obj, model) => _.has(obj, model.primaryKey) || _.has(obj, 'id');
const getPK = (obj, model) => (_.has(obj, model.primaryKey) ? obj[model.primaryKey] : obj.id);

module.exports = ({ model, strapi }) => {
  const assocKeys = model.associations.map(ast => ast.alias);
  const componentKeys = Object.keys(model.attributes).filter(key =>
    ['component', 'dynamiczone'].includes(model.attributes[key].type)
  );
  const hasDraftAndPublish = contentTypesUtils.hasDraftAndPublish(model);

  const excludedKeys = assocKeys.concat(componentKeys);

  const defaultPopulate = (options = {}) =>
    model.associations
      .filter(ast => ast.autoPopulate !== false)
      .map(ast => {
        const assocModel = strapi.db.getModelByAssoc(ast);
        const populate = {
          path: ast.alias,
          options: { publicationState: options.publicationState },
        };

        if (
          contentTypesUtils.hasDraftAndPublish(assocModel) &&
          DP_PUB_STATES.includes(options.publicationState)
        ) {
          populate.match = _.merge(
            populate.match,
            populateQueries.publicationState[options.publicationState]
          );
        }

        return populate;
      });

  const pickRelations = values => {
    return _.pick(values, assocKeys);
  };

  const omitExernalValues = values => {
    return _.omit(values, excludedKeys);
  };

  async function createComponents(entry, values, { isDraft }) {
    if (componentKeys.length === 0) return;

    for (let key of componentKeys) {
      const attr = model.attributes[key];
      const { type } = attr;

      if (type === 'component') {
        const { component, required = false, repeatable = false } = attr;

        const componentModel = strapi.components[component];

        if (!isDraft && required === true && !_.has(values, key)) {
          const err = new Error(`Component ${key} is required`);
          err.status = 400;
          throw err;
        }

        if (!_.has(values, key)) continue;

        const componentValue = values[key];

        if (repeatable === true) {
          const components = await Promise.all(
            componentValue.map(value => {
              return strapi.query(component).create(value);
            })
          );

          const componentsArr = components.map(componentEntry => ({
            kind: componentModel.globalId,
            ref: componentEntry.id,
          }));

          entry[key] = componentsArr;
          await entry.save();
        } else {
          if (componentValue === null) continue;

          const componentEntry = await strapi.query(component).create(componentValue);
          entry[key] = [
            {
              kind: componentModel.globalId,
              ref: componentEntry.id,
            },
          ];
          await entry.save();
        }
      }

      if (type === 'dynamiczone') {
        const { required = false } = attr;

        if (!isDraft && required === true && !_.has(values, key)) {
          const err = new Error(`Dynamiczone ${key} is required`);
          err.status = 400;
          throw err;
        }

        if (!_.has(values, key)) continue;

        const dynamiczoneValues = values[key];

        const dynamiczones = await Promise.all(
          dynamiczoneValues.map(value => {
            const component = value.__component;
            return strapi
              .query(component)
              .create(value)
              .then(entity => {
                return {
                  __component: value.__component,
                  entity,
                };
              });
          })
        );

        const componentsArr = dynamiczones.map(({ __component, entity }) => {
          const componentModel = strapi.components[__component];

          return {
            kind: componentModel.globalId,
            ref: entity.id,
          };
        });

        entry[key] = componentsArr;
        await entry.save();
      }
    }
  }

  async function updateComponents(entry, values) {
    if (componentKeys.length === 0) return;

    const updateOrCreateComponent = async ({ componentUID, value }) => {
      // check if value has an id then update else create
      const query = strapi.query(componentUID);
      if (hasPK(value, query.model)) {
        return query.update(
          {
            [query.model.primaryKey]: getPK(value, query.model),
          },
          value
        );
      }
      return query.create(value);
    };

    for (let key of componentKeys) {
      // if key isn't present then don't change the current component data
      if (!_.has(values, key)) continue;

      const attr = model.attributes[key];
      const { type } = attr;

      if (type === 'component') {
        const { component: componentUID, repeatable = false } = attr;

        const componentModel = strapi.components[componentUID];
        const componentValue = values[key];

        if (repeatable === true) {
          await deleteOldComponents(entry, componentValue, {
            key,
            componentModel,
          });

          const components = await Promise.all(
            componentValue.map(value => updateOrCreateComponent({ componentUID, value }))
          );
          const componentsArr = components.map(component => ({
            kind: componentModel.globalId,
            ref: component.id,
          }));

          entry[key] = componentsArr;
          await entry.save();
        } else {
          await deleteOldComponents(entry, componentValue, {
            key,
            componentModel,
          });

          if (componentValue === null) continue;

          const component = await updateOrCreateComponent({
            componentUID,
            value: componentValue,
          });

          entry[key] = [
            {
              kind: componentModel.globalId,
              ref: component.id,
            },
          ];
          await entry.save();
        }
      }

      if (type === 'dynamiczone') {
        const dynamiczoneValues = values[key];

        await deleteDynamicZoneOldComponents(entry, dynamiczoneValues, {
          key,
        });

        const dynamiczones = await Promise.all(
          dynamiczoneValues.map(value => {
            const componentUID = value.__component;
            return updateOrCreateComponent({ componentUID, value }).then(entity => {
              return {
                componentUID,
                entity,
              };
            });
          })
        );

        const componentsArr = dynamiczones.map(({ componentUID, entity }) => {
          const componentModel = strapi.components[componentUID];

          return {
            kind: componentModel.globalId,
            ref: entity.id,
          };
        });

        entry[key] = componentsArr;
        await entry.save();
      }
    }
    return;
  }

  async function deleteDynamicZoneOldComponents(entry, values, { key }) {
    const idsToKeep = values.reduce((acc, value) => {
      const component = value.__component;
      const componentModel = strapi.components[component];
      if (hasPK(value, componentModel)) {
        acc.push({
          id: getPK(value, componentModel).toString(),
          componentUID: componentModel.uid,
        });
      }

      return acc;
    }, []);

    const allIds = []
      .concat(entry[key] || [])
      .filter(el => el.ref)
      .map(el => ({
        id: el.ref._id.toString(),
        componentUID: findComponentByGlobalId(el.kind).uid,
      }));

    // verify the provided ids are realted to this entity.
    idsToKeep.forEach(({ id, componentUID }) => {
      if (!allIds.find(el => el.id === id && el.componentUID === componentUID)) {
        const err = new Error(
          `Some of the provided components in ${key} are not related to the entity`
        );
        err.status = 400;
        throw err;
      }
    });

    const idsToDelete = allIds.reduce((acc, { id, componentUID }) => {
      if (!idsToKeep.find(el => el.id === id && el.componentUID === componentUID)) {
        acc.push({
          id,
          componentUID,
        });
      }
      return acc;
    }, []);

    if (idsToDelete.length > 0) {
      const deleteMap = idsToDelete.reduce((map, { id, componentUID }) => {
        if (!_.has(map, componentUID)) {
          map[componentUID] = [id];
          return map;
        }

        map[componentUID].push(id);
        return map;
      }, {});

      await Promise.all(
        Object.keys(deleteMap).map(componentUID => {
          return strapi
            .query(componentUID)
            .delete({ [`${model.primaryKey}_in`]: deleteMap[componentUID] });
        })
      );
    }
  }

  async function deleteOldComponents(entry, componentValue, { key, componentModel }) {
    const componentArr = Array.isArray(componentValue) ? componentValue : [componentValue];

    const idsToKeep = componentArr
      .filter(val => hasPK(val, componentModel))
      .map(val => getPK(val, componentModel));

    const allIds = []
      .concat(entry[key] || [])
      .filter(el => el.ref)
      .map(el => el.ref._id);

    // verify the provided ids are related to this entity.
    idsToKeep.forEach(id => {
      if (allIds.findIndex(currentId => currentId.toString() === id.toString()) === -1) {
        const err = new Error(
          `Some of the provided components in ${key} are not related to the entity`
        );
        err.status = 400;
        throw err;
      }
    });

    const idsToDelete = allIds.reduce((acc, id) => {
      if (idsToKeep.includes(id.toString())) return acc;
      return acc.concat(id);
    }, []);

    if (idsToDelete.length > 0) {
      await strapi.query(componentModel.uid).delete({ [`${model.primaryKey}_in`]: idsToDelete });
    }
  }

  async function deleteComponents(entry) {
    if (componentKeys.length === 0) return;

    for (let key of componentKeys) {
      const attr = model.attributes[key];
      const { type } = attr;

      if (type === 'component') {
        const { component } = attr;
        const componentModel = strapi.components[component];

        if (Array.isArray(entry[key]) && entry[key].length > 0) {
          const idsToDelete = entry[key].map(el => el.ref);
          await strapi
            .query(componentModel.uid)
            .delete({ [`${model.primaryKey}_in`]: idsToDelete });
        }
      }

      if (type === 'dynamiczone') {
        if (Array.isArray(entry[key]) && entry[key].length > 0) {
          const idsToDelete = entry[key].map(el => ({
            componentUID: findComponentByGlobalId(el.kind).uid,
            id: el.ref,
          }));

          const deleteMap = idsToDelete.reduce((map, { id, componentUID }) => {
            if (!_.has(map, componentUID)) {
              map[componentUID] = [id];
              return map;
            }

            map[componentUID].push(id);
            return map;
          }, {});

          await Promise.all(
            Object.keys(deleteMap).map(componentUID => {
              return strapi.query(componentUID).delete({
                [`${model.primaryKey}_in`]: deleteMap[componentUID],
              });
            })
          );
        }
      }
    }
  }

  function find(params, populate) {
    const filters = convertRestQueryParams(params);
    const populateOpt = populate || defaultPopulate({ publicationState: filters.publicationState });

    return buildQuery({
      model,
      filters,
      populate: populateOpt,
    }).then(results => results.map(result => (result ? result.toObject() : null)));
  }

  async function findOne(params, populate) {
    const entries = await find({ ...params, _limit: 1 }, populate);
    return entries[0] || null;
  }

  function count(params) {
    const filters = convertRestQueryParams(params);

    return buildQuery({
      model,
      filters: { where: filters.where },
    }).count();
  }

  async function create(values) {
    // Extract values related to relational data.
    const relations = pickRelations(values);
    const data = omitExernalValues(values);

    if (hasDraftAndPublish) {
      data[PUBLISHED_AT_ATTRIBUTE] = _.has(values, PUBLISHED_AT_ATTRIBUTE)
        ? values[PUBLISHED_AT_ATTRIBUTE]
        : new Date();
    }

    // Create entry with no-relational data.
    const entry = await model.create(data);

    const isDraft = contentTypesUtils.isDraft(entry, model);
    await createComponents(entry, values, { isDraft });

    // Create relational data and return the entry.
    return model.updateRelations({
      [model.primaryKey]: getPK(entry, model),
      values: relations,
    });
  }

  async function update(params, values) {
    const entry = await model.findOne(params);

    if (!entry) {
      const err = new Error('entry.notFound');
      err.status = 404;
      throw err;
    }

    // Extract values related to relational data.
    const relations = pickRelations(values);
    const data = omitExernalValues(values);

    // update components first in case it fails don't update the entity
    await updateComponents(entry, values);
    // Update entry with no-relational data.
    await entry.updateOne(data);

    // Update relational data and return the entry.
    return model.updateRelations(Object.assign(params, { values: relations }));
  }

  async function deleteMany(params) {
    if (params[model.primaryKey]) {
      const entries = await find({ ...params, _limit: 1 });
      if (entries.length > 0) {
        return deleteOne(entries[0][model.primaryKey]);
      }
      return null;
    }

    const entries = await find(params);
    return Promise.all(entries.map(entry => deleteOne(entry[model.primaryKey])));
  }

  async function deleteOne(id) {
    const entry = await model
      .findOneAndRemove({ [model.primaryKey]: id })
      .populate(defaultPopulate());

    if (!entry) {
      const err = new Error('entry.notFound');
      err.status = 404;
      throw err;
    }

    await deleteComponents(entry);

    await model.deleteRelations(entry);

    return entry.toObject ? entry.toObject() : null;
  }

  function search(params, populate) {
    const filters = convertRestQueryParams(_.omit(params, '_q'));
    const populateOpt = populate || defaultPopulate({ publicationState: filters.publicationState });

    return buildQuery({
      model,
      filters,
      searchParam: params._q,
      populate: populateOpt,
    }).then(results => results.map(result => (result ? result.toObject() : null)));
  }

  function countSearch(params) {
    const { where } = convertRestQueryParams(_.omit(params, '_q'));

    return buildQuery({
      model,
      filters: { where },
      searchParam: params._q,
    }).count();
  }

  return {
    findOne,
    find,
    create,
    update,
    delete: deleteMany,
    count,
    search,
    countSearch,
  };
};
