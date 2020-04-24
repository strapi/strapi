'use strict';

const { replaceIdByPrimaryKey } = require('../utils/primary-key');
const { executeBeforeHook, executeAfterHook } = require('../utils/hooks');

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

    create: createQueryWithHooks({ query: 'create', model, connectorQuery }),
    update: createQueryWithHooks({ query: 'update', model, connectorQuery }),
    delete: createQueryWithHooks({ query: 'delete', model, connectorQuery }),
    find: createQueryWithHooks({ query: 'find', model, connectorQuery }),
    findOne: createQueryWithHooks({ query: 'findOne', model, connectorQuery }),
    count: createQueryWithHooks({ query: 'count', model, connectorQuery }),
    search: createQueryWithHooks({ query: 'search', model, connectorQuery }),
    countSearch: createQueryWithHooks({ query: 'countSearch', model, connectorQuery }),
  };
};

// wraps a connectorQuery call with:
// - param substitution
// - lifecycle hooks
const createQueryWithHooks = ({ query, model, connectorQuery }) => async (params, ...rest) => {
  // substite id for primaryKey value in params
  const newParams = replaceIdByPrimaryKey(params, model);
  const queryArguments = [newParams, ...rest];

  // execute before hook
  await executeBeforeHook(query, model, ...queryArguments);

  // execute query
  const result = await connectorQuery[query](...queryArguments);

  // execute after hook with result and arguments
  await executeAfterHook(query, model, result, ...queryArguments);

  // return result
  return result;
};
