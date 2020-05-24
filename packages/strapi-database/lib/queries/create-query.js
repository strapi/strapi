'use strict';

const { replaceIdByPrimaryKey } = require('../utils/primary-key');
const { executeBeforeLifecycle, executeAfterLifecycle } = require('../utils/lifecycles');

/**
 * @param {Object} opts options
 * @param {Object} opts.model The ORM model
 * @param {Object} opts.connectorQuery The ORM queries implementation
 */
module.exports = function createQuery(opts) {
  const { model, connectorQuery } = opts;

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

    create: createQueryWithLifecycles({ query: 'create', model, connectorQuery }),
    update: createQueryWithLifecycles({ query: 'update', model, connectorQuery }),
    delete: createQueryWithLifecycles({ query: 'delete', model, connectorQuery }),
    find: createQueryWithLifecycles({ query: 'find', model, connectorQuery }),
    findOne: createQueryWithLifecycles({ query: 'findOne', model, connectorQuery }),
    count: createQueryWithLifecycles({ query: 'count', model, connectorQuery }),
    search: createQueryWithLifecycles({ query: 'search', model, connectorQuery }),
    countSearch: createQueryWithLifecycles({ query: 'countSearch', model, connectorQuery }),
  };
};

// wraps a connectorQuery call with:
// - param substitution
// - lifecycle hooks
const createQueryWithLifecycles = ({ query, model, connectorQuery }) => async (params, ...rest) => {
  // substitute id for primaryKey value in params
  const newParams = replaceIdByPrimaryKey(params, model);
  const queryArguments = [newParams, ...rest];

  // execute before hook
  await executeBeforeLifecycle(query, model, ...queryArguments);

  // execute query
  const result = await connectorQuery[query](...queryArguments);

  // execute after hook with result and arguments
  await executeAfterLifecycle(query, model, result, ...queryArguments);

  // return result
  return result;
};
