const _ = require('lodash');
const { convertRestQueryParams, buildQuery } = require('strapi-utils');

module.exports = ({ model, modelKey }) => {
  const assocKeys = model.associations.map(ast => ast.alias);
  const groupKeys = Object.keys(model.attributes).filter(key => {
    return model.attributes[key].type === 'group';
  });
  const excludedKeys = assocKeys.concat(groupKeys);

  const defaultPopulate = model.associations
    .filter(ast => ast.autoPopulate !== false)
    .map(ast => ast.alias);

  const pickRelations = values => {
    return _.pick(values, assocKeys);
  };
  const omitExernalValues = values => {
    return _.omit(values, excludedKeys);
  };

  async function createGroups(entry, values, { transacting }) {
    if (groupKeys.length === 0) return;

    const joinModel = model.groupsJoinModel;
    const { foreignKey } = joinModel;

    for (let key of groupKeys) {
      const attr = model.attributes[key];
      const { group, required = true, repeatable = true } = attr;

      const groupModel = strapi.groups[group];

      const createGroupAndLink = async ({ value, order }) => {
        return groupModel
          .forge()
          .save(value, { transacting })
          .then(group => {
            return joinModel.forge().save(
              {
                [foreignKey]: entry.id,
                slice_type: groupModel.collectionName,
                slice_id: group.id,
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
      const { group, repeatable = true } = attr;

      const groupModel = strapi.groups[group];

      const groupValue = values[key];

      const updateOrCreateGroupAndLink = async ({ value, order }) => {
        // check if value has an id then update else create
        if (_.has(value, groupModel.primaryKey)) {
          return groupModel
            .forge(value)
            .save(value, { transacting, patch: true, require: false })
            .then(group => {
              return joinModel
                .forge()
                .query({
                  where: {
                    [foreignKey]: entry.id,
                    slice_type: groupModel.collectionName,
                    slice_id: group.id,
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
        return groupModel
          .forge()
          .save(value, { transacting })
          .then(group => {
            return joinModel.forge().save(
              {
                [foreignKey]: entry.id,
                slice_type: groupModel.collectionName,
                slice_id: group.id,
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
      .map(el => el[groupModel.primaryKey]);

    const allIds = await joinModel
      .forge()
      .query(qb => {
        qb.where(joinModel.foreignKey, entry.id).andWhere('field', key);
      })
      .fetchAll({ transacting })
      .map(el => el.get('slice_id'));

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
        .query(qb => qb.whereIn('slice_id', idsToDelete))
        .destroy({ transacting, require: false });

      await groupModel
        .forge()
        .query(qb => qb.whereIn(groupModel.primaryKey, idsToDelete))
        .destroy({ transacting, require: false });
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
            slice_type: groupModel.collectionName,
            field: key,
          },
        })
        .fetchAll({ transacting })
        .map(el => el.get('slice_id'));

      await groupModel
        .forge()
        .query(qb => qb.whereIn(groupModel.primaryKey, ids))
        .destroy({ transacting });
      await joinModel
        .forge()
        .query({
          where: {
            [foreignKey]: entry.id,
            slice_type: groupModel.collectionName,
            field: key,
          },
        })
        .destroy({ transacting });
    }
  }

  return {
    find(params, populate) {
      const withRelated = populate || defaultPopulate;

      const filters = convertRestQueryParams(params);

      return model
        .query(buildQuery({ model, filters }))
        .fetchAll({ withRelated });
    },

    findOne(params, populate) {
      const withRelated = populate || defaultPopulate;

      return model
        .forge({
          [model.primaryKey]: params[model.primaryKey] || params.id,
        })
        .fetch({
          withRelated,
        });
    },

    count(params = {}) {
      const { where } = convertRestQueryParams(params);

      return model.query(buildQuery({ model, filters: { where } })).count();
    },

    async create(values) {
      const relations = pickRelations(values);
      const data = omitExernalValues(values);

      const runCreate = async trx => {
        // Create entry with no-relational data.
        const entry = await model.forge(data).save(null, { transacting: trx });
        await createGroups(entry, values, { transacting: trx });
        return entry;
      };

      const db = strapi.connections[model.connection];
      const entry = await db.transaction(trx => runCreate(trx));

      return model.updateRelations({ id: entry.id, values: relations });
    },

    async update(params, values) {
      const entry = await model.forge(params).fetch();

      if (!entry) {
        const err = new Error('entry.notFound');
        err.status = 404;
        throw err;
      }

      // Extract values related to relational data.
      const relations = pickRelations(values);
      const data = omitExernalValues(values);

      const runUpdate = async trx => {
        const entry = await model
          .forge(params)
          .save(data, { transacting: trx });
        await updateGroups(entry, values, { transacting: trx });
      };

      const db = strapi.connections[model.connection];
      await db.transaction(trx => runUpdate(trx));

      return model.updateRelations(
        Object.assign(params, { values: relations })
      );

      // Create relational data and return the entry.
    },

    async delete(params) {
      const entry = await model.forge(params).fetch();

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
          case 'oneToMany':
          case 'manyToMany':
          case 'manyToManyMorph':
            values[association.alias] = [];
            break;
          default:
        }
      });

      await model.updateRelations({ ...params, values });

      const runDelete = async trx => {
        await deleteGroups(entry, { transacting: trx });
        await model.forge(params).destroy({ transacting: trx });
        return entry;
      };

      const db = strapi.connections[model.connection];
      return db.transaction(trx => runDelete(trx));
    },

    search(params, populate) {
      // Convert `params` object to filters compatible with Bookshelf.
      const filters = strapi.utils.models.convertParams(modelKey, params);

      // Select field to populate.
      const withRelated = populate || defaultPopulate;

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
          withRelated,
        });
    },

    countSearch(params) {
      return model.query(qb => buildSearchQuery(qb, model, params)).count();
    },
  };
};

/**
 * util to build search query
 * @param {*} qb
 * @param {*} model
 * @param {*} params
 */
const buildSearchQuery = (qb, model, params) => {
  const query = (params._q || '').replace(/[^a-zA-Z0-9.-\s]+/g, '');

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
      qb.orWhereRaw(attribute, _.toNumber(query));
    });
  }

  if (query === 'true' || query === 'false') {
    searchBool.forEach(attribute => {
      qb.orWhereRaw(attribute, _.toNumber(query === 'true'));
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
          : `to_tsvector('${attribute}')`
      );

      qb.orWhereRaw(`${searchQuery.join(' || ')} @@ to_tsquery(?)`, query);
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
  if (typeof value !== 'object') {
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
