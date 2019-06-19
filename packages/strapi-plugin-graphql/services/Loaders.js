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
      .filter(model => model !== 'core_store')
      .forEach(model => {
        (strapi.models[model].associations || []).forEach(association =>
          this.createLoader(
            association.collection || association.model,
            association.plugin
          )
        );
      });

    // Reproduce the same pattern for each plugin.
    Object.keys(strapi.plugins).forEach(plugin => {
      Object.keys(strapi.plugins[plugin].models).forEach(model => {
        (strapi.plugins[plugin].models[model].associations || []).forEach(
          association =>
            this.createLoader(
              association.collection || association.model,
              association.plugin
            )
        );
      });
    });
  },

  resetLoaders: function() {
    this.loaders = {};
  },

  createLoader: function(model, plugin) {
    const name = plugin ? `${plugin}__${model}` : model;

    // Exclude polymorphic from loaders.
    if (name === undefined) {
      return;
    }

    if (this.loaders[name]) {
      return this.loaders[name];
    }

    this.loaders[name] = new DataLoader(
      keys => {
        return new Promise(async (resolve, reject) => {
          try {
            // Extract queries from keys and merge similar queries.
            const { queries, map } = this.extractQueries(
              model,
              _.cloneDeep(keys)
            );

            // Run queries in parallel.
            const results = await Promise.all(
              queries.map(query => this.makeQuery(model, query))
            );

            // Use to match initial queries order.
            const data = this.mapData(model, keys, map, results);

            resolve(data);
          } catch (e) {
            reject(e);
          }
        });
      },
      {
        cacheKeyFn: key => {
          return _.isObjectLike(key) ? JSON.stringify(_.cloneDeep(key)) : key;
        },
      }
    );
  },

  mapData: function(model, originalMap, map, results) {
    // Use map to re-dispatch data correctly based on initial keys.
    return originalMap.map((query, index) => {
      // Find the index of where we should extract the results.
      const indexResults = map.findIndex(
        queryMap => queryMap.indexOf(index) !== -1
      );
      const data = results[indexResults];

      // Retrieving referring model.
      const ref = this.retrieveModel(model, query.options.source);

      if (query.single) {
        // Return object instead of array for one-to-many relationship.
        return data.find(
          entry =>
            entry[ref.primaryKey].toString() ===
            (query.params[ref.primaryKey] || '').toString()
        );
      }

      // Generate constant for skip parameters.
      // Note: we shouldn't support both way of doing this kind of things in the future.
      const skip = query.options._start || query.options._skip || 0;
      const limit = _.get(query, 'options._limit', 100); // Take into account the limit if its equal 0

      // Extracting ids from original request to map with query results.
      const ids = this.extractIds(query, ref);

      const ast = ref.associations.find(ast => ast.alias === ids.alias);
      const astModel = ast
        ? this.retrieveModel(ast.model || ast.collection, ast.plugin)
        : this.retrieveModel(model);

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
        .filter(entry =>
          ids
            .map(id => id.toString())
            .includes(entry[ref.primaryKey].toString())
        )
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

  makeQuery: async function(model, query = {}) {
    if (_.isEmpty(query.ids)) {
      return [];
    }

    // Retrieving referring model.
    const ref = this.retrieveModel(model, query.options.source);
    const ast = ref.associations.find(ast => ast.alias === query.alias);

    const params = {
      ...query.options,
      populate: ast ? [query.alias] : [], // Avoid useless population for performance reason
      query: {},
      _start: 0, // Don't apply start or skip
      _limit: -1, // Don't apply a limit
    };

    params.query[`${query.alias}_in`] = _.chain(query.ids)
      .filter(id => !_.isEmpty(id) || _.isInteger(id)) // Only keep valid ids
      .map(id => id.toString()) // convert ids to string
      .uniq() // Remove redundant ids
      .value();

    // Run query and remove duplicated ID.
    const request = await strapi.plugins['content-manager'].services[
      'contentmanager'
    ].fetchAll({ model }, params);

    return request && request.toJSON ? request.toJSON() : request;
  },

  retrieveModel: function(model, source) {
    // Retrieve refering model.
    return source ? strapi.plugins[source].models[model] : strapi.models[model];
  },

  extractQueries: function(model, keys) {
    const queries = [];
    const map = [];

    keys.forEach((current, index) => {
      // Extract query options.
      // Note: the `single` means that we've only one entry to fetch.
      const { single = false, params = {}, association } = current;
      const { query = {}, ...options } = current.options;

      // Retrieving referring model.
      const ref = this.retrieveModel(model, options.source);

      // Generate array of IDs to fetch.
      const ids = [];

      // Only one entry to fetch.
      if (single) {
        ids.push(params[ref.primaryKey]);
      } else if (_.isArray(query[ref.primaryKey])) {
        ids.push(...query[ref.primaryKey]);
      } else {
        ids.push(query[association.via]);
      }

      queries.push({
        ids,
        options,
        alias: _.first(Object.keys(query)) || ref.primaryKey,
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
