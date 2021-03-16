'use strict';

const _ = require('lodash');
const {
  contentTypes: {
    hasDraftAndPublish,
    constants: { DP_PUB_STATE_LIVE, DP_PUB_STATE_PREVIEW, PUBLISHED_AT_ATTRIBUTE },
  },
} = require('strapi-utils');

const optionsMap = {
  publicationState: {
    queries: {
      [DP_PUB_STATE_LIVE]: ({ model, alias }) => qb => {
        const { collectionName } = model;
        qb.whereNotNull(`${alias || collectionName}.${PUBLISHED_AT_ATTRIBUTE}`);
      },
      [DP_PUB_STATE_PREVIEW]: () => null,
    },
    validate({ model, query: publicationState }) {
      return hasDraftAndPublish(model) && _.has(this.queries, publicationState);
    },
  },
};

const isValidOption = optionName => _.has(optionsMap, optionName);

const validate = (optionName, params) => {
  const opt = _.get(optionsMap, optionName, {});
  return !_.isFunction(opt.validate) || opt.validate(params);
};

const resolveQuery = (option, params) => optionsMap[option].queries[params.query](params);

/**
 * Transform given options to populate queries based on the optionsMap
 * @param options
 * @returns Array<Function>
 */
const toQueries = options => {
  return Object.keys(options).reduce((acc, key) => {
    const params = options[key];

    if (isValidOption(key) && validate(key, params)) {
      const query = resolveQuery(key, params);
      if (_.isFunction(query)) {
        return [...acc, query];
      }
    }
    return acc;
  }, []);
};

/**
 * Execute each query based on the query builder (qb) passed as argument
 * @param queries
 * @param qb
 */
const runPopulateQueries = (queries, qb) => {
  qb.where(qb => queries.forEach(query => query(qb)));
};

/**
 * Return an object which associates each given path to a populateQueries's runner
 * @param paths
 * @param options
 * @returns {*}
 */
const bindPopulateQueries = (paths, options) => {
  const queries = toQueries(options);
  const qbFn = qb => {
    runPopulateQueries(queries, qb);
  };

  return paths.reduce((acc, path) => ({ ...acc, [path]: qbFn }), {});
};

/**
 * Extend the behavior of an already existing populate query, and bind generated (from options) ones to it
 * @param fns
 * @param options
 * @returns {function(...[*]=)}
 */
const extendWithPopulateQueries = (fns, options) => {
  const queries = toQueries(options);

  return qb => {
    fns.filter(_.isFunction).forEach(fn => fn(qb));
    runPopulateQueries(queries, qb);
  };
};

/**
 * Transforms queryOptions (e.g { publicationState: 'live' })
 * into query map
 * {
 *   publicationState: { query: 'live', ...context }
 * }
 * @param {{ [key: string]: string }} queryOptions
 * @param {object} context
 */
const queryOptionsToQueryMap = (queryOptions, context) => {
  return Object.keys(queryOptions).reduce((acc, key) => {
    acc[key] = { query: queryOptions[key], ...context };
    return acc;
  }, {});
};

module.exports = {
  toQueries,
  runPopulateQueries,
  bindPopulateQueries,
  extendWithPopulateQueries,
  queryOptionsToQueryMap,
};
