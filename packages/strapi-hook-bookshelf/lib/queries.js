'use strict';
/**
 * Implementation of model queries for bookshelf
 */

const _ = require('lodash');
const {
  convertRestQueryParams,
  buildQuery,
  models: modelUtils,
} = require('strapi-utils');

module.exports = function createQueryBuilder({ model, modelKey, strapi }) {
  /* Utils */
  // association key
  const assocKeys = model.associations.map(ast => ast.alias);
  // group keys
  const groupKeys = Object.keys(model.attributes).filter(key => {
    return model.attributes[key].type === 'group';
  });

  const timestamps = _.get(model, ['options', 'timestamps'], []);

  // Returns an object with relation keys only to create relations in DB
  const pickRelations = values => {
    return _.pick(values, assocKeys);
  };

  // keys to exclude to get attribute keys
  const excludedKeys = assocKeys.concat(groupKeys);
  // Returns an object without relational keys to persist in DB
  const selectAttributes = values => {
    return _.pickBy(values, (value, key) => {
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

  /**
   * Find one entry based on params
   */
  async function findOne(params, populate, { transacting } = {}) {
    const primaryKey = params[model.primaryKey] || params.id;

    if (primaryKey) {
      params = {
        [model.primaryKey]: primaryKey,
      };
    }

    const entry = await model.forge(params).fetch({
      withRelated: populate,
      transacting,
    });

    return entry ? entry.toJSON() : null;
  }

  /**
   * Find multiple entries based on params
   */
  function find(params, populate, { transacting } = {}) {
    const filters = convertRestQueryParams(params);

    return model
      .query(buildQuery({ model, filters }))
      .fetchAll({
        withRelated: populate,
        transacting,
      })
      .then(results => results.toJSON());
  }

  /**
   * Count entries based on filters
   */
  function count(params = {}) {
    const { where } = convertRestQueryParams(params);

    return model.query(buildQuery({ model, filters: { where } })).count();
  }

  async function create(values, { transacting } = {}) {
    const relations = pickRelations(values);
    const data = selectAttributes(values);

    const runCreate = async trx => {
      // Create entry with no-relational data.
      const entry = await model.forge(data).save(null, { transacting: trx });
      await createGroups(entry, values, { transacting: trx });

      return model.updateRelations(
        { id: entry.id, values: relations },
        { transacting: trx }
      );
    };

    return wrapTransaction(runCreate, { transacting });
  }

  async function update(params, values, { transacting } = {}) {
    const entry = await model.forge(params).fetch({ transacting });

    if (!entry) {
      const err = new Error('entry.notFound');
      err.status = 404;
      throw err;
    }

    // Extract values related to relational data.
    const relations = pickRelations(values);
    const data = selectAttributes(values);

    const runUpdate = async trx => {
      const updatedEntry =
        Object.keys(data).length > 0
          ? await entry.save(data, {
              transacting: trx,
              method: 'update',
              patch: true,
            })
          : entry;
      await updateGroups(updatedEntry, values, { transacting: trx });

      if (Object.keys(relations).length > 0) {
        return model.updateRelations(
          Object.assign(params, { values: relations }),
          { transacting: trx }
        );
      }

      return this.findOne(params, null, { transacting: trx });
    };

    return wrapTransaction(runUpdate, { transacting });
  }

  async function deleteOne(params, { transacting } = {}) {
    const entry = await model.forge(params).fetch({ transacting });

    if (!entry) {
      const err = new Error('entry.notFound');
      err.status = 404;
      throw err;
    }

    const values = {};
    model.associations.map(association => {
      switch (association.nature) {
        case 'oneWay':
        case 'oneToOne':
        case 'manyToOne':
        case 'oneToManyMorph':
          values[association.alias] = null;
          break;
        case 'manyWay':
        case 'oneToMany':
        case 'manyToMany':
        case 'manyToManyMorph':
          values[association.alias] = [];
          break;
        default:
      }
    });

    await model.updateRelations({ ...params, values }, { transacting });

    const runDelete = async trx => {
      await deleteGroups(entry, { transacting: trx });
      await model.forge(params).destroy({ transacting: trx, require: false });
      return entry.toJSON();
    };

    return wrapTransaction(runDelete, { transacting });
  }

  async function deleteMany(params, { transacting } = {}) {
    const primaryKey = params[model.primaryKey] || params.id;

    if (primaryKey) return deleteOne(params, { transacting });

    const entries = await find(params, null, { transacting });
    return await Promise.all(
      entries.map(entry => deleteOne({ id: entry.id }, { transacting }))
    );
  }

  function search(params, populate) {
    // Convert `params` object to filters compatible with Bookshelf.
    const filters = modelUtils.convertParams(modelKey, params);

    return model
      .query(qb => {
        buildSearchQuery(qb, model, params);

        if (filters.sort) {
          qb.orderBy(filters.sort.key, filters.sort.order);
        }

        if (filters.start) {
          qb.offset(_.toNumber(filters.start));
        }

        if (filters.limit) {
          qb.limit(_.toNumber(filters.limit));
        }
      })
      .fetchAll({
        withRelated: populate,
      })
      .then(results => results.toJSON());
  }

  function countSearch(params) {
    return model
      .query(qb => {
        buildSearchQuery(qb, model, params);
      })
      .count();
  }

  async function createGroups(entry, values, { transacting }) {
    if (groupKeys.length === 0) return;

    const joinModel = model.groupsJoinModel;
    const { foreignKey } = joinModel;

    for (let key of groupKeys) {
      const attr = model.attributes[key];
      const { group, required = false, repeatable = false } = attr;

      const groupModel = strapi.groups[group];

      const createGroupAndLink = async ({ value, order }) => {
        return strapi
          .query(groupModel.uid)
          .create(value, { transacting })
          .then(group => {
            return joinModel.forge().save(
              {
                [foreignKey]: entry.id,
                group_type: groupModel.collectionName,
                group_id: group.id,
                field: key,
                order,
              },
              { transacting }
            );
          });
      };

      if (required === true && !_.has(values, key)) {
        const err = new Error(`Group ${key} is required`);
        err.status = 400;
        throw err;
      }

      if (!_.has(values, key)) continue;

      const groupValue = values[key];

      if (repeatable === true) {
        validateRepeatableInput(groupValue, { key, ...attr });
        await Promise.all(
          groupValue.map((value, idx) =>
            createGroupAndLink({ value, order: idx + 1 })
          )
        );
      } else {
        validateNonRepeatableInput(groupValue, { key, ...attr });

        if (groupValue === null) continue;
        await createGroupAndLink({ value: groupValue, order: 1 });
      }
    }
  }

  async function updateGroups(entry, values, { transacting }) {
    if (groupKeys.length === 0) return;

    const joinModel = model.groupsJoinModel;
    const { foreignKey } = joinModel;

    for (let key of groupKeys) {
      // if key isn't present then don't change the current group data
      if (!_.has(values, key)) continue;

      const attr = model.attributes[key];
      const { group, repeatable = false } = attr;

      const groupModel = strapi.groups[group];

      const groupValue = values[key];

      const updateOrCreateGroupAndLink = async ({ value, order }) => {
        // check if value has an id then update else create
        if (_.has(value, groupModel.primaryKey)) {
          return strapi
            .query(groupModel.uid)
            .update(
              {
                [groupModel.primaryKey]: value[groupModel.primaryKey],
              },
              value,
              { transacting }
            )
            .then(group => {
              return joinModel
                .forge()
                .query({
                  where: {
                    [foreignKey]: entry.id,
                    group_type: groupModel.collectionName,
                    group_id: group.id,
                    field: key,
                  },
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
          .query(groupModel.uid)
          .create(value, { transacting })
          .then(group => {
            return joinModel.forge().save(
              {
                [foreignKey]: entry.id,
                group_type: groupModel.collectionName,
                group_id: group.id,
                field: key,
                order,
              },
              { transacting }
            );
          });
      };

      if (repeatable === true) {
        validateRepeatableInput(groupValue, { key, ...attr });

        await deleteOldGroups(entry, groupValue, {
          key,
          joinModel,
          groupModel,
          transacting,
        });

        await Promise.all(
          groupValue.map((value, idx) => {
            return updateOrCreateGroupAndLink({ value, order: idx + 1 });
          })
        );
      } else {
        validateNonRepeatableInput(groupValue, { key, ...attr });

        await deleteOldGroups(entry, groupValue, {
          key,
          joinModel,
          groupModel,
          transacting,
        });

        if (groupValue === null) continue;

        await updateOrCreateGroupAndLink({ value: groupValue, order: 1 });
      }
    }
    return;
  }

  async function deleteOldGroups(
    entry,
    groupValue,
    { key, joinModel, groupModel, transacting }
  ) {
    const groupArr = Array.isArray(groupValue) ? groupValue : [groupValue];

    const idsToKeep = groupArr
      .filter(el => _.has(el, groupModel.primaryKey))
      .map(el => el[groupModel.primaryKey].toString());

    const allIds = await joinModel
      .forge()
      .query(qb => {
        qb.where(joinModel.foreignKey, entry.id).andWhere('field', key);
      })
      .fetchAll({ transacting })
      .map(el => el.get('group_id').toString());

    // verify the provided ids are realted to this entity.
    idsToKeep.forEach(id => {
      if (!allIds.includes(id)) {
        const err = new Error(
          `Some of the provided groups in ${key} are not related to the entity`
        );
        err.status = 400;
        throw err;
      }
    });

    const idsToDelete = _.difference(allIds, idsToKeep);
    if (idsToDelete.length > 0) {
      await joinModel
        .forge()
        .query(qb => qb.whereIn('group_id', idsToDelete).andWhere('field', key))
        .destroy({ transacting, require: false });

      await strapi
        .query(groupModel.uid)
        .delete(
          { [`${groupModel.primaryKey}_in`]: idsToDelete },
          { transacting }
        );
    }
  }

  async function deleteGroups(entry, { transacting }) {
    if (groupKeys.length === 0) return;

    const joinModel = model.groupsJoinModel;
    const { foreignKey } = joinModel;

    for (let key of groupKeys) {
      const attr = model.attributes[key];
      const { group } = attr;

      const groupModel = strapi.groups[group];

      const ids = await joinModel
        .forge()
        .query({
          where: {
            [foreignKey]: entry.id,
            group_type: groupModel.collectionName,
            field: key,
          },
        })
        .fetchAll({ transacting })
        .map(el => el.get('group_id'));

      await strapi
        .query(groupModel.uid)
        .delete({ [`${groupModel.primaryKey}_in`]: ids }, { transacting });

      await joinModel
        .forge()
        .query({
          where: {
            [foreignKey]: entry.id,
            group_type: groupModel.collectionName,
            field: key,
          },
        })
        .destroy({ transacting, require: false });
    }
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

/**
 * util to build search query
 * @param {*} qb
 * @param {*} model
 * @param {*} params
 */
const buildSearchQuery = (qb, model, params) => {
  const query = params._q;

  const associations = model.associations.map(x => x.alias);

  const searchText = Object.keys(model._attributes)
    .filter(
      attribute =>
        attribute !== model.primaryKey && !associations.includes(attribute)
    )
    .filter(attribute =>
      ['string', 'text'].includes(model._attributes[attribute].type)
    );

  const searchInt = Object.keys(model._attributes)
    .filter(
      attribute =>
        attribute !== model.primaryKey && !associations.includes(attribute)
    )
    .filter(attribute =>
      ['integer', 'decimal', 'float'].includes(
        model._attributes[attribute].type
      )
    );

  const searchBool = Object.keys(model._attributes)
    .filter(
      attribute =>
        attribute !== model.primaryKey && !associations.includes(attribute)
    )
    .filter(attribute =>
      ['boolean'].includes(model._attributes[attribute].type)
    );

  if (!_.isNaN(_.toNumber(query))) {
    searchInt.forEach(attribute => {
      qb.orWhere(attribute, _.toNumber(query));
    });
  }

  if (query === 'true' || query === 'false') {
    searchBool.forEach(attribute => {
      qb.orWhere(attribute, _.toNumber(query === 'true'));
    });
  }

  // Search in columns with text using index.
  switch (model.client) {
    case 'mysql':
      qb.orWhereRaw(
        `MATCH(${searchText.join(',')}) AGAINST(? IN BOOLEAN MODE)`,
        `*${query}*`
      );
      break;
    case 'pg': {
      const searchQuery = searchText.map(attribute =>
        _.toLower(attribute) === attribute
          ? `to_tsvector(${attribute})`
          : `to_tsvector("${attribute}")`
      );

      qb.orWhereRaw(`${searchQuery.join(' || ')} @@ plainto_tsquery(?)`, query);
      break;
    }
  }
};

function validateRepeatableInput(value, { key, min, max }) {
  if (!Array.isArray(value)) {
    const err = new Error(`Group ${key} is repetable. Expected an array`);
    err.status = 400;
    throw err;
  }

  value.forEach(val => {
    if (typeof val !== 'object' || Array.isArray(val) || val === null) {
      const err = new Error(
        `Group ${key} as invalid items. Expected each items to be objects`
      );
      err.status = 400;
      throw err;
    }
  });

  if (min && value.length < min) {
    const err = new Error(`Group ${key} must contain at least ${min} items`);
    err.status = 400;
    throw err;
  }
  if (max && value.length > max) {
    const err = new Error(`Group ${key} must contain at most ${max} items`);
    err.status = 400;
    throw err;
  }
}

function validateNonRepeatableInput(value, { key, required }) {
  if (typeof value !== 'object' || Array.isArray(value)) {
    const err = new Error(`Group ${key} should be an object`);
    err.status = 400;
    throw err;
  }

  if (required === true && value === null) {
    const err = new Error(`Group ${key} is required`);
    err.status = 400;
    throw err;
  }
}
