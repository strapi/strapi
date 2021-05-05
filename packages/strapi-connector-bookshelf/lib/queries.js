'use strict';
/**
 * Implementation of model queries for bookshelf
 */

const _ = require('lodash');
const { omit } = require('lodash/fp');
const pmap = require('p-map');
const { convertRestQueryParams, buildQuery, escapeQuery } = require('strapi-utils');
const { contentTypes: contentTypesUtils } = require('strapi-utils');
const { singular } = require('pluralize');
const { handleDatabaseError } = require('./utils/errors');

const BATCH_SIZE = 1000;

const { PUBLISHED_AT_ATTRIBUTE } = contentTypesUtils.constants;
const pickCountFilters = omit(['sort', 'limit', 'start']);

module.exports = function createQueryBuilder({ model, strapi }) {
  /* Utils */
  // association key
  const assocKeys = model.associations.map(ast => ast.alias);
  // component keys
  const componentKeys = Object.keys(model.attributes).filter(key => {
    return ['dynamiczone', 'component'].includes(model.attributes[key].type);
  });

  const timestamps = _.get(model, ['options', 'timestamps'], []);
  const hasDraftAndPublish = contentTypesUtils.hasDraftAndPublish(model);

  // Returns an object with relation keys only to create relations in DB
  const pickRelations = attributes => {
    return _.pick(attributes, assocKeys);
  };

  // keys to exclude to get attribute keys
  const excludedKeys = assocKeys.concat(componentKeys);
  // Returns an object without relational keys to persist in DB
  const selectAttributes = attributes => {
    return _.pickBy(attributes, (value, key) => {
      if (Array.isArray(timestamps) && timestamps.includes(key)) {
        return false;
      }

      return !excludedKeys.includes(key) && _.has(model.allAttributes, key);
    });
  };

  const wrapTransaction = (fn, { transacting } = {}) => {
    const db = strapi.connections[model.connection];

    if (transacting) return fn(transacting);
    return db.transaction(trx => fn(trx));
  };

  const wrapErrors = fn => async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      return handleDatabaseError(error);
    }
  };

  /**
   * Find one entry based on params
   */
  async function findOne(params, populate, { transacting } = {}) {
    const entries = await find({ ...params, _limit: 1 }, populate, { transacting });
    return entries[0] || null;
  }

  /**
   * Find multiple entries based on params
   */
  function find(params, populate, { transacting } = {}) {
    const filters = convertRestQueryParams(params);
    const query = buildQuery({ model, filters });

    return model
      .query(query)
      .fetchAll({
        withRelated: populate,
        transacting,
        publicationState: filters.publicationState,
      })
      .then(results => results.toJSON());
  }

  /**
   * Count entries based on filters
   */
  function count(params = {}, { transacting } = {}) {
    const filters = pickCountFilters(convertRestQueryParams(params));

    return model
      .query(buildQuery({ model, filters }))
      .count({ transacting })
      .then(Number);
  }

  async function create(attributes, { transacting } = {}) {
    const relations = pickRelations(attributes);
    const data = { ...selectAttributes(attributes) };

    if (hasDraftAndPublish) {
      data[PUBLISHED_AT_ATTRIBUTE] = _.has(attributes, PUBLISHED_AT_ATTRIBUTE)
        ? attributes[PUBLISHED_AT_ATTRIBUTE]
        : new Date();
    }

    const runCreate = async trx => {
      // Create entry with no-relational data.
      const entry = await model.forge(data).save(null, { transacting: trx });
      const isDraft = contentTypesUtils.isDraft(entry.toJSON(), model);
      await createComponents(entry, attributes, { transacting: trx, isDraft });

      return model.updateRelations({ id: entry.id, values: relations }, { transacting: trx });
    };

    return wrapTransaction(runCreate, { transacting });
  }

  async function update(params, attributes, { transacting } = {}) {
    const entry = await model.where(params).fetch({ transacting });

    if (!entry) {
      const err = new Error('entry.notFound');
      err.status = 404;
      throw err;
    }

    // Extract attributes related to relational data.
    const relations = pickRelations(attributes);
    const data = selectAttributes(attributes);

    const runUpdate = async trx => {
      const updatedEntry =
        Object.keys(data).length > 0
          ? await entry.save(data, {
              transacting: trx,
              method: 'update',
              patch: true,
            })
          : entry;

      await updateComponents(updatedEntry, attributes, { transacting: trx });

      if (Object.keys(relations).length > 0) {
        return model.updateRelations({ id: entry.id, values: relations }, { transacting: trx });
      }

      return findOne(params, null, { transacting: trx });
    };

    return wrapTransaction(runUpdate, { transacting });
  }

  async function deleteOne(id, { transacting } = {}) {
    const entry = await model.where({ [model.primaryKey]: id }).fetch({ transacting });

    if (!entry) {
      const err = new Error('entry.notFound');
      err.status = 404;
      throw err;
    }

    await model.deleteRelations(id, { transacting });

    const runDelete = async trx => {
      await deleteComponents(entry, { transacting: trx });
      await model.where({ id: entry.id }).destroy({ transacting: trx, require: false });
      return entry.toJSON();
    };

    return wrapTransaction(runDelete, { transacting });
  }

  async function deleteMany(
    params,
    { transacting, returning = true, batchSize = BATCH_SIZE } = {}
  ) {
    if (params[model.primaryKey]) {
      const entries = await find({ ...params, _limit: 1 }, null, { transacting });
      if (entries.length > 0) {
        return deleteOne(entries[0][model.primaryKey], { transacting });
      }
      return null;
    }

    if (returning) {
      const paramsWithDefaults = _.defaults(params, { _limit: -1 });
      const entries = await find(paramsWithDefaults, null, { transacting });
      return pmap(entries, entry => deleteOne(entry.id, { transacting }), {
        concurrency: 100,
        stopOnError: true,
      });
    }

    // returning false, we can optimize the function
    const batchParams = _.assign({}, params, { _limit: batchSize, _sort: 'id:ASC' });
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const batch = await find(batchParams, null, { transacting });

      await pmap(batch, entry => deleteOne(entry.id, { transacting }), {
        concurrency: 100,
        stopOnError: true,
      });

      if (batch.length < BATCH_SIZE) {
        break;
      }
    }
  }

  function search(params, populate) {
    const filters = convertRestQueryParams(_.omit(params, '_q'));

    return model
      .query(qb => qb.where(buildSearchQuery({ model, params })))
      .query(buildQuery({ model, filters }))
      .fetchAll({ withRelated: populate })
      .then(results => results.toJSON());
  }

  function countSearch(params) {
    const countParams = omit(['_q'], params);
    const filters = pickCountFilters(convertRestQueryParams(countParams));

    return model
      .query(qb => qb.where(buildSearchQuery({ model, params })))
      .query(buildQuery({ model, filters }))
      .count()
      .then(Number);
  }

  async function createComponents(entry, attributes, { transacting, isDraft }) {
    if (componentKeys.length === 0) return;

    const joinModel = model.componentsJoinModel;
    const { foreignKey } = joinModel;

    const createComponentAndLink = async ({ componentModel, value, key, order }) => {
      return strapi
        .query(componentModel.uid)
        .create(value, { transacting })
        .then(component => {
          return joinModel.forge().save(
            {
              [foreignKey]: entry.id,
              component_type: componentModel.collectionName,
              component_id: component.id,
              field: key,
              order,
            },
            { transacting }
          );
        });
    };

    for (let key of componentKeys) {
      const attr = model.attributes[key];
      const { type } = attr;

      switch (type) {
        case 'component': {
          const { component, required = false, repeatable = false } = attr;
          const componentModel = strapi.components[component];

          if (!isDraft && required === true && !_.has(attributes, key)) {
            const err = new Error(`Component ${key} is required`);
            err.status = 400;
            throw err;
          }

          if (!_.has(attributes, key)) continue;

          const componentValue = attributes[key];

          if (repeatable === true) {
            await Promise.all(
              componentValue.map((value, idx) =>
                createComponentAndLink({
                  componentModel,
                  value,
                  key,
                  order: idx + 1,
                })
              )
            );
          } else {
            if (componentValue === null) continue;
            await createComponentAndLink({
              componentModel,
              key,
              value: componentValue,
              order: 1,
            });
          }
          break;
        }
        case 'dynamiczone': {
          const { required = false } = attr;

          if (!isDraft && required === true && !_.has(attributes, key)) {
            const err = new Error(`Dynamiczone ${key} is required`);
            err.status = 400;
            throw err;
          }

          if (!_.has(attributes, key)) continue;

          const dynamiczoneValues = attributes[key];

          await Promise.all(
            dynamiczoneValues.map((value, idx) => {
              const component = value.__component;
              const componentModel = strapi.components[component];
              return createComponentAndLink({
                componentModel,
                value: _.omit(value, ['__component']),
                key,
                order: idx + 1,
              });
            })
          );
          break;
        }
      }
    }
  }

  async function updateComponents(entry, attributes, { transacting }) {
    if (componentKeys.length === 0) return;

    const joinModel = model.componentsJoinModel;
    const { foreignKey } = joinModel;

    const updateOrCreateComponentAndLink = async ({ componentModel, key, value, order }) => {
      // check if value has an id then update else create
      if (_.has(value, componentModel.primaryKey)) {
        return strapi
          .query(componentModel.uid)
          .update(
            {
              [componentModel.primaryKey]: value[componentModel.primaryKey],
            },
            value,
            { transacting }
          )
          .then(component => {
            return joinModel
              .where({
                [foreignKey]: entry.id,
                component_type: componentModel.collectionName,
                component_id: component.id,
                field: key,
              })
              .save(
                {
                  order,
                },
                { transacting, patch: true, require: false }
              );
          });
      }
      // create
      return strapi
        .query(componentModel.uid)
        .create(value, { transacting })
        .then(component => {
          return joinModel.forge().save(
            {
              [foreignKey]: entry.id,
              component_type: componentModel.collectionName,
              component_id: component.id,
              field: key,
              order,
            },
            { transacting }
          );
        });
    };

    for (let key of componentKeys) {
      // if key isn't present then don't change the current component data
      if (!_.has(attributes, key)) continue;

      const attr = model.attributes[key];
      const { type } = attr;

      switch (type) {
        case 'component': {
          const { component, repeatable = false } = attr;

          const componentModel = strapi.components[component];

          const componentValue = attributes[key];

          if (repeatable === true) {
            await deleteOldComponents(entry, componentValue, {
              key,
              joinModel,
              componentModel,
              transacting,
            });

            await Promise.all(
              componentValue.map((value, idx) => {
                return updateOrCreateComponentAndLink({
                  componentModel,
                  key,
                  value,
                  order: idx + 1,
                });
              })
            );
          } else {
            await deleteOldComponents(entry, componentValue, {
              key,
              joinModel,
              componentModel,
              transacting,
            });

            if (componentValue === null) continue;

            await updateOrCreateComponentAndLink({
              componentModel,
              key,
              value: componentValue,
              order: 1,
            });
          }

          break;
        }
        case 'dynamiczone': {
          const dynamiczoneValues = attributes[key];

          await deleteDynamicZoneOldComponents(entry, dynamiczoneValues, {
            key,
            joinModel,
            transacting,
          });

          await Promise.all(
            dynamiczoneValues.map((value, idx) => {
              const component = value.__component;
              const componentModel = strapi.components[component];
              return updateOrCreateComponentAndLink({
                componentModel,
                value: _.omit(value, ['__component']),
                key,
                order: idx + 1,
              });
            })
          );
          break;
        }
      }
    }
  }

  async function deleteDynamicZoneOldComponents(entry, values, { key, joinModel, transacting }) {
    const idsToKeep = values.reduce((acc, value) => {
      const component = value.__component;
      const componentModel = strapi.components[component];
      if (_.has(value, componentModel.primaryKey)) {
        acc.push({
          id: value[componentModel.primaryKey].toString(),
          component: componentModel,
        });
      }

      return acc;
    }, []);

    const allIds = await joinModel
      .query(qb => {
        qb.where(joinModel.foreignKey, entry.id).andWhere('field', key);
      })
      .fetchAll({ transacting })
      .map(el => {
        const componentKey = Object.keys(strapi.components).find(
          key => strapi.components[key].collectionName === el.get('component_type')
        );

        return {
          id: el.get('component_id').toString(),
          component: strapi.components[componentKey],
        };
      });

    // verify the provided ids are related to this entity.
    idsToKeep.forEach(({ id, component }) => {
      if (!allIds.find(el => el.id === id && el.component.uid === component.uid)) {
        const err = new Error(
          `Some of the provided components in ${key} are not related to the entity`
        );
        err.status = 400;
        throw err;
      }
    });

    const idsToDelete = allIds.reduce((acc, { id, component }) => {
      if (!idsToKeep.find(el => el.id === id && el.component.uid === component.uid)) {
        acc.push({
          id,
          component,
        });
      }
      return acc;
    }, []);

    if (idsToDelete.length > 0) {
      await joinModel
        .query(qb => {
          qb.where('field', key);
          qb.where(qb => {
            idsToDelete.forEach(({ id, component }) => {
              qb.orWhere(qb => {
                qb.where('component_id', id).andWhere('component_type', component.collectionName);
              });
            });
          });
        })
        .destroy({ transacting });

      for (const idToDelete of idsToDelete) {
        const { id, component } = idToDelete;
        const model = strapi.query(component.uid);
        await model.delete({ [model.primaryKey]: id }, { transacting });
      }
    }
  }

  async function deleteOldComponents(
    entry,
    componentValue,
    { key, joinModel, componentModel, transacting }
  ) {
    const componentArr = Array.isArray(componentValue) ? componentValue : [componentValue];

    const idsToKeep = componentArr
      .filter(el => _.has(el, componentModel.primaryKey))
      .map(el => el[componentModel.primaryKey].toString());

    const allIds = await joinModel
      .where({
        [joinModel.foreignKey]: entry.id,
        field: key,
      })
      .fetchAll({ transacting })
      .map(el => el.get('component_id').toString());

    // verify the provided ids are related to this entity.
    idsToKeep.forEach(id => {
      if (!allIds.includes(id)) {
        const err = new Error(
          `Some of the provided components in ${key} are not related to the entity`
        );
        err.status = 400;
        throw err;
      }
    });

    const idsToDelete = _.difference(allIds, idsToKeep);
    if (idsToDelete.length > 0) {
      await joinModel
        .query(qb => qb.whereIn('component_id', idsToDelete).andWhere('field', key))
        .destroy({ transacting, require: false });

      await strapi
        .query(componentModel.uid)
        .delete({ [`${componentModel.primaryKey}_in`]: idsToDelete }, { transacting });
    }
  }

  async function deleteComponents(entry, { transacting }) {
    if (componentKeys.length === 0) return;

    const joinModel = model.componentsJoinModel;
    const { foreignKey } = joinModel;

    for (let key of componentKeys) {
      const attr = model.attributes[key];
      const { type } = attr;

      switch (type) {
        case 'component': {
          const { component } = attr;

          const componentModel = strapi.components[component];

          const ids = await joinModel
            .where({
              [foreignKey]: entry.id,
              field: key,
            })
            .fetchAll({ transacting })
            .map(el => el.get('component_id'));

          await strapi
            .query(componentModel.uid)
            .delete({ [`${componentModel.primaryKey}_in`]: ids }, { transacting });

          await joinModel
            .where({
              [foreignKey]: entry.id,
              field: key,
            })
            .destroy({ transacting, require: false });
          break;
        }
        case 'dynamiczone': {
          const { components } = attr;

          const componentJoins = await joinModel
            .where({
              [foreignKey]: entry.id,
              field: key,
            })
            .fetchAll({ transacting })
            .map(el => ({
              id: el.get('component_id'),
              componentType: el.get('component_type'),
            }));

          for (const compo of components) {
            const { uid, collectionName } = strapi.components[compo];
            const model = strapi.query(uid);

            const toDelete = componentJoins.filter(el => el.componentType === collectionName);

            if (toDelete.length > 0) {
              await model.delete(
                {
                  [`${model.primaryKey}_in`]: toDelete.map(el => el.id),
                },
                { transacting }
              );
            }
          }

          await joinModel
            .where({
              [foreignKey]: entry.id,
              field: key,
            })
            .destroy({ transacting, require: false });

          break;
        }
      }
    }
  }

  async function fetchRelationCounters(attribute, entitiesIds = []) {
    const assoc = model.associations.find(assoc => assoc.alias === attribute);
    const assocModel = strapi.db.getModelByAssoc(assoc);
    const knex = strapi.connections[model.connection];
    const targetAttribute = assocModel.attributes[assoc.via];

    switch (assoc.nature) {
      case 'oneToMany': {
        return knex
          .select()
          .column({ id: assoc.via, count: knex.raw('count(*)') })
          .from(assocModel.collectionName)
          .whereIn(assoc.via, entitiesIds)
          .groupBy(assoc.via);
      }
      case 'manyWay': {
        const column = `${singular(model.collectionName)}_${model.primaryKey}`;
        return knex
          .select()
          .column({ id: column, count: knex.raw('count(*)') })
          .from(assoc.tableCollectionName)
          .whereIn(column, entitiesIds)
          .groupBy(column);
      }
      case 'manyToMany': {
        const column = `${targetAttribute.attribute}_${targetAttribute.column}`;
        return knex
          .select()
          .column({ id: column, count: knex.raw('count(*)') })
          .from(assoc.tableCollectionName)
          .whereIn(column, entitiesIds)
          .groupBy(column);
      }
      default: {
        return [];
      }
    }
  }

  return {
    findOne,
    find,
    create: wrapErrors(create),
    update: wrapErrors(update),
    delete: deleteMany,
    count,
    search,
    countSearch,
    fetchRelationCounters,
  };
};

/**
 * util to build search query
 * @param {*} model
 * @param {*} params
 */
const buildSearchQuery = ({ model, params }) => qb => {
  const query = params._q;

  const associations = model.associations.map(x => x.alias);
  const stringTypes = ['string', 'text', 'uid', 'email', 'enumeration', 'richtext'];
  const numberTypes = ['biginteger', 'integer', 'decimal', 'float'];

  const searchColumns = Object.keys(model._attributes)
    .filter(attribute => !associations.includes(attribute))
    .filter(attribute => stringTypes.includes(model._attributes[attribute].type))
    .filter(attribute => model._attributes[attribute].searchable !== false);

  if (!_.isNaN(_.toNumber(query))) {
    const numberColumns = Object.keys(model._attributes)
      .filter(attribute => !associations.includes(attribute))
      .filter(attribute => numberTypes.includes(model._attributes[attribute].type))
      .filter(attribute => model._attributes[attribute].searchable !== false);
    searchColumns.push(...numberColumns);
  }

  if ([...numberTypes, ...stringTypes].includes(model.primaryKeyType)) {
    searchColumns.push(model.primaryKey);
  }

  // Search in columns with text using index.
  switch (model.client) {
    case 'pg':
      searchColumns.forEach(attr =>
        qb.orWhereRaw(
          `"${model.collectionName}"."${attr}"::text ILIKE ?`,
          `%${escapeQuery(query, '*%\\')}%`
        )
      );
      break;
    case 'sqlite3':
      searchColumns.forEach(attr =>
        qb.orWhereRaw(
          `"${model.collectionName}"."${attr}" LIKE ? ESCAPE '\\'`,
          `%${escapeQuery(query, '*%\\')}%`
        )
      );
      break;
    case 'mysql':
      searchColumns.forEach(attr =>
        qb.orWhereRaw(
          `\`${model.collectionName}\`.\`${attr}\` LIKE ?`,
          `%${escapeQuery(query, '*%\\')}%`
        )
      );
      break;
  }
};
