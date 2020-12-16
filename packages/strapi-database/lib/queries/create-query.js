'use strict';

const pmap = require('p-map');
const { prop } = require('lodash/fp');
const { MANY_RELATIONS } = require('strapi-utils').relations.constants;

const { createQueryWithLifecycles, withLifecycles } = require('./helpers');
const { createFindPageQuery, createSearchPageQuery } = require('./paginated-queries');

/**
 * @param {Object} opts options
 * @param {Object} opts.model The ORM model
 * @param {Object} opts.connectorQuery The ORM queries implementation
 */
module.exports = function createQuery(opts) {
  const { model, connectorQuery } = opts;

  const createFn = createQueryWithLifecycles({
    query: 'create',
    model,
    connectorQuery,
  });

  const findOrSearchWithRelationCounts = method =>
    async function(params, populate) {
      const xManyAssocs = [];
      const xToOnePopulate = [];
      model.associations
        .filter(assoc => !populate || populate.includes(assoc.alias))
        .forEach(assoc => {
          if (MANY_RELATIONS.includes(assoc.nature)) {
            xManyAssocs.push(assoc);
          } else {
            xToOnePopulate.push(assoc.alias);
          }
        });

      const { results, pagination } = await this[method](params, model, xToOnePopulate);
      const resultsIds = results.map(prop('id'));

      const counters = await Promise.all(
        xManyAssocs.map(async assoc => ({
          field: assoc.alias,
          counts: await this.fetchRelationCounters(assoc.alias, resultsIds),
        }))
      );

      results.forEach(entity => {
        counters.forEach(counter => {
          entity[counter.field] = { count: counter.counts[entity.id] || 0 };
        });
      });

      return {
        results,
        pagination,
      };
    };

  return {
    get model() {
      return model;
    },

    get orm() {
      return model.orm;
    },

    get primaryKey() {
      return model.primaryKey;
    },

    get associations() {
      return model.associations;
    },

    /**
     * Run custom database logic
     */
    custom(mapping) {
      if (typeof mapping === 'function') {
        return mapping.bind(this, { model: this.model });
      }

      if (!mapping[this.orm]) {
        throw new Error(`Missing mapping for orm ${this.orm}`);
      }

      if (typeof mapping[this.orm] !== 'function') {
        throw new Error(`Custom queries must be functions received ${typeof mapping[this.orm]}`);
      }

      return mapping[this.model.orm].call(this, { model: this.model });
    },

    create: createFn,
    createMany: (entities, { concurrency = 100 } = {}, ...rest) => {
      return pmap(entities, entity => createFn(entity, ...rest), {
        concurrency,
        stopOnError: true,
      });
    },
    update: createQueryWithLifecycles({ query: 'update', model, connectorQuery }),
    delete: createQueryWithLifecycles({ query: 'delete', model, connectorQuery }),
    find: createQueryWithLifecycles({ query: 'find', model, connectorQuery }),
    findOne: createQueryWithLifecycles({ query: 'findOne', model, connectorQuery }),
    count: createQueryWithLifecycles({ query: 'count', model, connectorQuery }),
    search: createQueryWithLifecycles({ query: 'search', model, connectorQuery }),
    countSearch: createQueryWithLifecycles({ query: 'countSearch', model, connectorQuery }),
    fetchRelationCounters: async (...args) => {
      const results = await connectorQuery.fetchRelationCounters(...args);
      return results.reduce((map, { id, count }) => Object.assign(map, { [id]: count }), {});
    },
    findPage: withLifecycles({ query: 'findPage', model, fn: createFindPageQuery(connectorQuery) }),
    searchPage: withLifecycles({
      query: 'searchPage',
      model,
      fn: createSearchPageQuery(connectorQuery),
    }),
    searchWithRelationCounts(...args) {
      return findOrSearchWithRelationCounts('searchPage').bind(this)(...args);
    },
    findWithRelationCounts(...args) {
      return findOrSearchWithRelationCounts('findPage').bind(this)(...args);
    },
  };
};
