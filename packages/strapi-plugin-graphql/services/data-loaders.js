'use strict';

/**
 * Loaders.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

const _ = require('lodash');
const DataLoader = require('dataloader');

module.exports = {
  loaders: {},

  initializeLoader: function() {
    this.resetLoaders();

    // Create loaders for each relational field (exclude core models).
    Object.keys(strapi.models)
      .filter(model => model.internal !== true)
      .forEach(modelKey => {
        const model = strapi.models[modelKey];
        this.createLoader(model.uid);
      });

    // Reproduce the same pattern for each plugin.
    Object.keys(strapi.plugins).forEach(plugin => {
      Object.keys(strapi.plugins[plugin].models).forEach(modelKey => {
        const model = strapi.plugins[plugin].models[modelKey];
        this.createLoader(model.uid);
      });
    });

    // Add the loader for the AdminUser as well, so we can query `created_by` and `updated_by` AdminUsers
    this.createLoader('strapi::user');
  },

  resetLoaders: function() {
    this.loaders = {};
  },

  createLoader: function(modelUID) {
    if (this.loaders[modelUID]) {
      return this.loaders[modelUID];
    }

    this.loaders[modelUID] = new DataLoader(
      keys => {
        // Extract queries from keys and merge similar queries.
        const { queries, map } = this.extractQueries(modelUID, _.cloneDeep(keys));

        // Run queries in parallel.
        return Promise.all(queries.map(query => this.makeQuery(modelUID, query))).then(results => {
          // Use to match initial queries order.
          return this.mapData(modelUID, keys, map, results);
        });
      },
      {
        cacheKeyFn: key => {
          return _.isObjectLike(key) ? JSON.stringify(_.cloneDeep(key)) : key;
        },
      }
    );
  },

  mapData: function(modelUID, originalMap, map, results) {
    // Use map to re-dispatch data correctly based on initial keys.
    return originalMap.map((query, index) => {
      // Find the index of where we should extract the results.
      const indexResults = map.findIndex(queryMap => queryMap.indexOf(index) !== -1);
      const data = results[indexResults];

      // Retrieving referring model.
      const ref = strapi.getModel(modelUID);

      if (query.single) {
        // Return object instead of array for one-to-many relationship.
        return data.find(
          entry =>
            entry[ref.primaryKey].toString() === (query.params[ref.primaryKey] || '').toString()
        );
      }

      // Generate constant for skip parameters.
      // Note: we shouldn't support both way of doing this kind of things in the future.
      const skip = query.options._start || 0;
      const limit = _.get(query, 'options._limit', 100); // Take into account the limit if its equal 0

      // Extracting ids from original request to map with query results.
      const ids = this.extractIds(query, ref);

      const ast = ref.associations.find(ast => ast.alias === ids.alias);
      const astModel = ast
        ? strapi.getModel(ast.model || ast.collection, ast.plugin)
        : strapi.getModel(modelUID);

      if (!_.isArray(ids)) {
        return data
          .filter(entry => entry !== undefined)
          .filter(entry => {
            const aliasEntry = entry[ids.alias];

            if (_.isArray(aliasEntry)) {
              return _.find(
                aliasEntry,
                value => value[astModel.primaryKey].toString() === ids.value
              );
            }

            const entryValue = aliasEntry[astModel.primaryKey].toString();
            return entryValue === ids.value;
          })
          .slice(skip, skip + limit);
      }

      return data
        .filter(entry => entry !== undefined)
        .filter(entry => ids.map(id => id.toString()).includes(entry[ref.primaryKey].toString()))
        .slice(skip, skip + limit);
    });
  },

  extractIds: (query, ref) => {
    if (_.get(query.options, `query.${ref.primaryKey}`)) {
      return _.get(query.options, `query.${ref.primaryKey}`);
    }

    const alias = _.first(Object.keys(query.options.query));
    const value = query.options.query[alias].toString();
    return {
      alias,
      value,
    };
  },

  makeQuery: async function(modelUID, query = {}) {
    if (_.isEmpty(query.ids)) {
      return [];
    }

    const ref = strapi.getModel(modelUID);
    const ast = ref.associations.find(ast => ast.alias === query.alias);

    console.log(query);

    const ids = _.chain(query.ids)
      .filter(id => !_.isEmpty(id) || _.isInteger(id)) // Only keep valid ids
      .map(id => id.toString()) // convert ids to string
      .uniq() // Remove redundant ids
      .value();

    const params = {
      ...query.options,
      [`${query.alias}_in`]: ids,
      _start: 0, // Don't apply start or skip
      _limit: -1, // Don't apply a limit
    };

    console.log(params);

    // Run query and remove duplicated ID.
    return strapi.entityService.find(
      { params, populate: ast ? [query.alias] : [] },
      { model: modelUID }
    );
  },

  extractQueries: function(modelUID, keys) {
    const queries = [];
    const map = [];

    keys.forEach((current, index) => {
      // Extract query options.
      // Note: the `single` means that we've only one entry to fetch.
      const { single = false, params = {}, association } = current;
      const { query = {}, ...options } = current.options;

      // Retrieving referring model.
      const { primaryKey } = strapi.getModel(modelUID);

      // Generate array of IDs to fetch.
      const ids = [];

      // Only one entry to fetch.
      if (single) {
        ids.push(params[primaryKey]);
      } else if (_.isArray(query[primaryKey])) {
        ids.push(...query[primaryKey]);
      } else {
        ids.push(query[association.via]);
      }

      queries.push({
        ids,
        options,
        alias: _.first(Object.keys(query)) || primaryKey,
      });

      map[queries.length - 1 > 0 ? queries.length - 1 : 0] = [];
      map[queries.length - 1].push(index);
    });

    return {
      queries,
      map,
    };
  },
};
