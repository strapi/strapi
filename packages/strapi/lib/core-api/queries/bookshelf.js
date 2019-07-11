const _ = require('lodash');
const { convertRestQueryParams, buildQuery } = require('strapi-utils');

module.exports = ({ model, modelKey }) => {
  return {
    find(params, populate) {
      const withRelated =
        populate ||
        model.associations
          .filter(ast => ast.autoPopulate !== false)
          .map(ast => ast.alias);

      const filters = convertRestQueryParams(params);

      return model
        .query(buildQuery({ model, filters }))
        .fetchAll({ withRelated });
    },

    findOne(params, populate) {
      const withRelated =
        populate ||
        model.associations
          .filter(ast => ast.autoPopulate !== false)
          .map(ast => ast.alias);

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
      const relations = _.pick(
        values,
        model.associations.map(ast => ast.alias)
      );

      const data = _.omitBy(values, excludeExernalValues(model));

      const db = strapi.connections[model.connection];
      return db
        .transaction(async trx => {
          // Create entry with no-relational data.
          const entry = await model
            .forge(data)
            .save(null, { transacting: trx });

          await createGroups(entry, values, { model, transacting: trx });
          return entry;
        })
        .then(entry => {
          return model.updateRelations({ id: entry.id, values: relations });
        });
    },

    async update(params, values) {
      // Extract values related to relational data.
      const relations = _.pick(
        values,
        model.associations.map(ast => ast.alias)
      );

      const data = _.omitBy(values, excludeExernalValues(model));

      const db = strapi.connections[model.connection];
      return db
        .transaction(async trx => {
          const entry = await model
            .forge(params)
            .save(data, { transacting: trx });
          await updateGroups(entry, values, { model, transacting: trx });
        })
        .then(() => {
          return model.updateRelations(
            Object.assign(params, { values: relations })
          );
        });

      // Create relational data and return the entry.
    },

    async delete(params) {
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
      return model.forge(params).destroy();
    },

    search(params, populate) {
      // Convert `params` object to filters compatible with Bookshelf.
      const filters = strapi.utils.models.convertParams(modelKey, params);

      // Select field to populate.
      const withRelated =
        populate ||
        model.associations
          .filter(ast => ast.autoPopulate !== false)
          .map(ast => ast.alias);

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

/**
 *
 * @param {Object} entry - the entity the groups are linked ot
 * @param {Object} values - Input values
 * @param {Object} options
 * @param {Object} options.model - the ref model
 * @param {Object} options.transacting - transaction option
 */
async function createGroups(entry, values, { model, transacting }) {
  const groupKeys = Object.keys(model.attributes).filter(key => {
    return model.attributes[key].type === 'group';
  });

  for (let key of groupKeys) {
    const attr = model.attributes[key];
    const { group, required = true, repeatable = true } = attr;

    const joinModel = entry[key].joinModel;
    const { foreignKey } = joinModel;
    const groupModel = strapi.groups[group];

    const createGroupAndLink = async ({ value, order }) => {
      return groupModel
        .forge(value)
        .save(null, { transacting })
        .then(group => {
          return joinModel
            .forge({
              [foreignKey]: entry.id,
              slice_type: groupModel.collectionName,
              slice_id: group.id,
              field: key,
              order,
            })
            .save(null, { transacting });
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

async function updateGroups(entry, values, { model, transacting }) {
  const groupKeys = Object.keys(model.attributes).filter(key => {
    return model.attributes[key].type === 'group';
  });

  for (let key of groupKeys) {
    // if key isn't present then don't change the current group data
    if (!_.has(values, key)) continue;

    const attr = model.attributes[key];
    const { group, repeatable = true } = attr;

    const joinModel = entry[key].joinModel;
    const { foreignKey } = joinModel;
    const groupModel = strapi.groups[group];

    const groupValue = values[key];

    const updateOreateGroupAndLink = async ({ value, order }) => {
      // check if value has an id then update else create

      return groupModel
        .forge(value)
        .save(null, { transacting })
        .then(group => {
          return joinModel
            .forge({
              [foreignKey]: entry.id,
              slice_type: groupModel.collectionName,
              slice_id: group.id,
              field: key,
              order,
            })
            .save(null, { transacting });
        });
    };

    if (repeatable === true) {
      validateRepeatableInput(groupValue, { key, ...attr });

      // TODO: delete the ones not kept and their links
      // const idsToDelete = groupValue
      //   .filter(el => _.has(el, 'id'))
      //   .map(el => el.id);

      // await groupModel
      //   .forge()
      //   .whereIn('id', idsToDelete)
      //   .destroy();

      // await joinModel
      //   .forge()
      //   .where('slice_type', groupModel.collectionName)
      //   .whereIn('slice_id', idsToDelete)
      //   .destroy();

      await Promise.all(
        groupValue.map((value, idx) => {
          return updateOreateGroupAndLink({ value, order: idx + 1 });
        })
      );
    } else {
      validateNonRepeatableInput(groupValue, { key, ...attr });

      // TODO: if the value has an id => update
      // else delete and create

      await updateOreateGroupAndLink({ value: groupValue, order: 1 });
    }
  }
  return;
}

function validateRepeatableInput(value, { key, min, max }) {
  console.log('validateRepeatableInput', key, value);
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

function excludeExernalValues(model) {
  const assocKeys = model.associations.map(ast => ast.alias);
  const groupKeys = Object.keys(model.attributes).filter(key => {
    return model.attributes[key].type === 'group';
  });

  const excludedKeys = assocKeys.concat(groupKeys);
  return (value, key) => excludedKeys.includes(key);
}
