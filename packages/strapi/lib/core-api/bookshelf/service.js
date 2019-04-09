'use strict';

/**
 * default service
 *
 */

const _ = require('lodash');

// Strapi utilities.
const { convertRestQueryParams, buildQuery } = require('strapi-utils');

module.exports = ({ modelId }) => {
  return {
    /**
     * Promise to fetch all records
     *
     * @return {Promise}
     */

    fetchAll: (params, populate) => {
      const model = strapi.models[modelId];

      // Select field to populate.
      const withRelated =
        populate ||
        model.associations
          .filter(ast => ast.autoPopulate !== false)
          .map(ast => ast.alias);

      const filters = convertRestQueryParams(params);

      return model
        .query(buildQuery({ model, filters }))
        .fetchAll({ withRelated })
        .then(data => data.toJSON());
    },

    /**
     * Promise to fetch record
     *
     * @return {Promise}
     */

    fetch: params => {
      const model = strapi.models[modelId];

      // Select field to populate.
      const populate = model.associations
        .filter(ast => ast.autoPopulate !== false)
        .map(ast => ast.alias);

      return model.forge(_.pick(params, 'id')).fetch({
        withRelated: populate,
      });
    },

    /**
     * Promise to count record
     *
     * @return {Promise}
     */

    count: params => {
      const model = strapi.models[modelId];

      // Convert `params` object to filters compatible with Bookshelf.
      const filters = convertRestQueryParams(params);

      return model
        .query(buildQuery({ model: model, filters: _.pick(filters, 'where') }))
        .count();
    },

    /**
     * Promise to add record
     *
     * @return {Promise}
     */

    add: async values => {
      const model = strapi.models[modelId];

      // Extract values related to relational data.
      const relations = _.pick(
        values,
        model.associations.map(ast => ast.alias)
      );
      const data = _.omit(values, model.associations.map(ast => ast.alias));

      // Create entry with no-relational data.
      const entry = await model.forge(data).save();

      // Create relational data and return the entry.
      return model.updateRelations({ id: entry.id, values: relations });
    },

    /**
     * Promise to edit record
     *
     * @return {Promise}
     */

    edit: async (params, values) => {
      const model = strapi.models[modelId];

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

    /**
     * Promise to remove record
     *
     * @return {Promise}
     */

    remove: async params => {
      const model = strapi.models[modelId];

      params.values = {};
      model.associations.map(association => {
        switch (association.nature) {
          case 'oneWay':
          case 'oneToOne':
          case 'manyToOne':
          case 'oneToManyMorph':
            params.values[association.alias] = null;
            break;
          case 'oneToMany':
          case 'manyToMany':
          case 'manyToManyMorph':
            params.values[association.alias] = [];
            break;
          default:
        }
      });

      await model.updateRelations(params);

      return model.forge(params).destroy();
    },

    /**
     * Promise to search record
     *
     * @return {Promise}
     */

    search: async params => {
      const model = strapi.models[modelId];

      // Convert `params` object to filters compatible with Bookshelf.
      const filters = strapi.utils.models.convertParams(model.globalId, params);
      // Select field to populate.
      const populate = model.associations
        .filter(ast => ast.autoPopulate !== false)
        .map(ast => ast.alias);

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

      const query = (params._q || '').replace(/[^a-zA-Z0-9.-\s]+/g, '');

      return model
        .query(qb => {
          if (!_.isNaN(_.toNumber(query))) {
            searchInt.forEach(attribute => {
              qb.orWhereRaw(`${attribute} = ${_.toNumber(query)}`);
            });
          }

          if (query === 'true' || query === 'false') {
            searchBool.forEach(attribute => {
              qb.orWhereRaw(`${attribute} = ${_.toNumber(query === 'true')}`);
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

              qb.orWhereRaw(
                `${searchQuery.join(' || ')} @@ to_tsquery(?)`,
                query
              );
              break;
            }
          }

          if (filters.sort) {
            qb.orderBy(filters.sort.key, filters.sort.order);
          }

          if (filters.skip) {
            qb.offset(_.toNumber(filters.skip));
          }

          if (filters.limit) {
            qb.limit(_.toNumber(filters.limit));
          }
        })
        .fetchAll({
          withRelated: populate,
        });
    },
  };
};
