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

  createLoader: function(model) {
    this.loaders[model] = new DataLoader(keys => {
      return new Promise(async (resolve, reject) => {
        try {
          // Extract queries from keys and merge similar queries.
          const { queries, map } = this.extractQueries(model, _.cloneDeep(keys));
          // Run queries in parallel.
          const results = await Promise.all(queries.map((query) => this.makeQuery(model, query)));
          // Use to match initial queries order.
          resolve(this.mapData(model, keys, map, results));
        } catch (e) {
          reject(e);
        }
      });
    }, {
      cacheKeyFn: (key) => {
        return _.isObjectLike(key) ? JSON.stringify(_.cloneDeep(key)) : key;
      }
    });
  },

  mapData: function(model, originalMap, map, results) {
    // Use map to re-dispatch data correctly based on initial keys.
    return originalMap.map((query, index) => {
      // Find the index of where we should extract the results.
      const indexResults = map.findIndex(queryMap => queryMap.indexOf(index) !== -1);
      const data = results[indexResults];

      // Retrieving referring model.
      const ref = this.retrieveModel(model, query.options.source);
      // Extracting ids from original request to map with query results.
      const ids = query.options.query[ref.primaryKey];

      return ids.map(id => 
        data.find(entry => (entry._id || entry.id || '').toString() === id.toString())
      );
    });
  },

  makeQuery: async function(model, query = {}) {
    // Retrieve refering model.
    const ref = this.retrieveModel(model, _.get(query.options, 'source'));
    // Run query and remove duplicated ID.
    const request = await strapi.plugins['content-manager'].services['contentmanager'].fetchAll({ model }, {
      ...query.options,
      query: {
        [ref.primaryKey]: _.uniq(query.ids.map(x => x.toString()))
      },
      populate: []
    });
    
    return request && request.toJSON ? request.toJSON() : request;
  },

  retrieveModel: function(model, source) {
    // Retrieve refering model.
    return source ?
      strapi.plugins[source].models[model]:
      strapi.models[model];
  },

  extractQueries: function(model, keys) {
    const queries = [];
    const map = [];
    
    keys.forEach((current, index) => {
      // Extract query options.
      const { query, ...options } = current.options;
      // Retrieving referring model.
      const ref = this.retrieveModel(model, options.source);

      // Find similar query.
      const indexQueries = queries.findIndex(query => _.isEqual(query.options, options));

      if (indexQueries !== -1) {
        // Push to the same query the new IDs to fetch.
        queries[indexQueries].ids.push(...query[ref.primaryKey]);
        map[indexQueries].push(index);
      } else {
        // Create new query in the query.
        queries.push({
          ids: query[ref.primaryKey],
          options: options
        });
        
        map[queries.length - 1 > 0 ? queries.length - 1 : 0] = [];
        map[queries.length - 1].push(index);
      }
    });

    return {
      queries,
      map
    };
  }
};