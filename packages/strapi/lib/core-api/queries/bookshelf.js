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

      const assocKeys = model.associations.map(ast => ast.alias);
      const groupKeys = Object.keys(model.attributes).filter(
        key => model.attributes[key].type === 'group'
      );
      const data = _.omit(values, [...assocKeys, ...groupKeys]);

      const co = strapi.connections[model.connection];

      await co.transaction(async trx => {
        // Create entry with no-relational data.
        const entry = await model.forge(data).save(null, { transacting: trx });

        for (let key of groupKeys) {
          const {
            group,
            required = true,
            repeatable = true,
            min,
            max,
          } = model.attributes[key];

          const joinModel = entry[key].joinModel;
          const groupModel = strapi.groups[group];

          if (required === true && !_.has(values, key)) {
            const err = new Error(`Group ${key} is required`);
            err.status = 400;
            throw err;
          }

          if (!_.has(values, key)) return;

          const groupValue = values[key];

          if (repeatable === true) {
            if (!Array.isArray(groupValue)) {
              const err = new Error(
                `Group ${key} is repetable. Expected an array`
              );
              err.status = 400;
              throw err;
            }

            if (min && groupValue.length < min) {
              const err = new Error(
                `Group ${key} must contains at least ${min} items`
              );
              err.status = 400;
              throw err;
            }
            if (max && groupValue.length > max) {
              const err = new Error(
                `Group ${key} must contains at most ${max} items`
              );
              err.status = 400;
              throw err;
            }

            const arr = await Promise.all(
              groupValue.map(val => {
                return groupModel.forge(val).save(null, { transacting: trx });
              })
            );

            for (let idx = 0; idx < arr.length; idx++) {
              await joinModel
                .forge({
                  [joinModel.foreignKey]: entry.id,
                  slice_type: groupModel.collectionName,
                  slice_id: arr[idx].id,
                  field: key,
                  order: idx + 1,
                })
                .save(null, { transacting: trx });
            }

            return;
          }

          if (typeof groupValue !== 'object') {
            const err = new Error(`Group ${key} should be an object`);
            err.status = 400;
            throw err;
          }

          if (required === true && groupValue === null) {
            const err = new Error(`Group ${key} is required`);
            err.status = 400;
            throw err;
          }

          // create entity
          const res = await groupModel
            .forge(groupValue)
            .save(null, { transacting: trx });

          // create relation
          await joinModel
            .forge({
              [joinModel.foreignKey]: entry.id,
              slice_type: groupModel.collectionName,
              slice_id: res.id,
              field: key,
              order: 1,
            })
            .save(null, { transacting: trx });
        }

        // Create relational data and return the entry.
        return model.updateRelations({ id: entry.id, values: relations });
      });
    },

    async update(params, values) {
      // Extract values related to relational data.
      const relations = _.pick(
        values,
        model.associations.map(ast => ast.alias)
      );
      const data = _.omit(values, model.associations.map(ast => ast.alias));

      // Create entry with no-relational data.
      await model.forge(params).save(data);

      // Create relational data and return the entry.
      return model.updateRelations(
        Object.assign(params, { values: relations })
      );
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
