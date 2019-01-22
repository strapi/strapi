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
        (strapi.models[model].associations || []).forEach(association => this.createLoader(association.collection || association.model, association.plugin));
      });

    // Reproduce the same pattern for each plugin.
    Object.keys(strapi.plugins).forEach(plugin => {
      Object.keys(strapi.plugins[plugin].models).forEach(model => {
        (strapi.plugins[plugin].models[model].associations || []).forEach(association => this.createLoader(association.collection || association.model, association.plugin));
      });
    });
  },

  resetLoaders: function () {
    this.loaders = {};
  },

  createLoader: function(model, plugin) {
    const name = plugin ? `${plugin}__${model}`: model;

    // Exclude polymorphic from loaders.
    if (name === undefined) {
      return;
    }

    if (this.loaders[name]) {
      return this.loaders[name];
    }

    this.loaders[name] = new DataLoader(keys => {
      return new Promise(async (resolve, reject) => {
        try {
          // Extract queries from keys and merge similar queries.
          const { queries, map } = this.extractQueries(model, _.cloneDeep(keys));
          // Run queries in parallel.
          const results = await Promise.all(queries.map((query) => this.makeQuery(model, query)));
          // Use to match initial queries order.
          const data = this.mapData(model, keys, map, results);

          resolve(data);
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

      if (query.single) {
        // Return object instead of array for one-to-many relationship.
        return data.find(entry => entry[ref.primaryKey].toString() === (query.params[ref.primaryKey] || '').toString());
      }

      // Generate constant for skip parameters.
      // Note: we shouldn't support both way of doing this kind of things in the future.
      const skip = query.options.start || query.options.skip;

      // Extracting ids from original request to map with query results.
      const ids = this.extractIds(query, ref);
      
      if (!_.isArray(ids)) {
        return data
          .filter(entry => entry[ids.alias].toString() === ids.value.toString())
          .slice(skip, skip + query.options.limit);
      }

      // Critical: don't touch this part until you truly understand what you're doing.
      // The data array takes care of the sorting of the entries. It explains why we are looping from this array and not the `ids` array.
      // Then, we're applying the `limit`, `start` and `skip` argument.
      return data
        .filter(entry => entry !== undefined)
        .filter(entry => ids.map(id => id.toString()).includes(entry[ref.primaryKey].toString()))
        .slice(skip, skip + query.options.limit);
    });
  },

  extractIds: (query, ref) => {
    if ( _.get(query.options, `query.${ref.primaryKey}`)) {
      return  _.get(query.options, `query.${ref.primaryKey}`);
    }

    // Single object to retrieve (one-to-many).
    const alias = _.first(Object.keys(query.options.query));

    return {
      alias,
      value: _.get(query.options, `query.${alias}`)
    };
  },

  makeQuery: async function(model, query = {}) {
    if (_.isEmpty(query.ids)) {
      return [];
    }

    const ref = this.retrieveModel(model, query.options.source);

    // Construct parameters object sent to the Content Manager service.
    // We are faking the `start`, `skip` and `limit` argument because it doesn't make sense because we are merging different requests in one.
    // Note: we're trying to avoid useless populate for performances. Please be careful if you're updating this part.
    const populate = ref.associations
      .filter(association => !association.dominant && _.isEmpty(association.model))
      .map(association => association.alias);

    const params = {
      ...query.options,
      populate,
      query: query.options.where || {},
      start: 0,
      skip: 0,
      limit: 100,
    };

    params.query[query.alias] = _.uniq(query.ids.filter(x => !_.isEmpty(x)).map(x => x.toString()));

    if (['id', '_id'].includes(query.alias)) {
      // However, we're applying a limit based on the number of entries we've to fetch.
      // We'll apply the real `skip`, `start` and `limit` parameters during the mapping above.
      params.limit = params.query[query.alias].length;
    }

    // Run query and remove duplicated ID.
    const request = await strapi.plugins['content-manager'].services['contentmanager'].fetchAll({ model }, params);

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
      // Note: the `single` means that we've only one entry to fetch.
      const { single = false, params = {}, association } = current;
      const { query = {}, ...options } = current.options;
  
      // Retrieving referring model.
      const ref = this.retrieveModel(model, options.source);

      // Find similar query.
      const indexQueries = queries.findIndex(query => _.isEqual(query.options, options));

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

      if (indexQueries !== -1) {
        // Push to the same query the new IDs to fetch.
        queries[indexQueries].ids.push(...ids);
        map[indexQueries].push(index);
      } else {
        // Create new query in the query.
        queries.push({
          ids,
          options,
          alias: _.first(Object.keys(query)) || ref.primaryKey
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