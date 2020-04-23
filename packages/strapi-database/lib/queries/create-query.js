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

    create: wrapQuery({ hook: 'create', model, connectorQuery }),
    update: wrapQuery({ hook: 'update', model, connectorQuery }),
    delete: wrapQuery({ hook: 'delete', model, connectorQuery }),
    find: wrapQuery({ hook: 'find', model, connectorQuery }),
    findOne: wrapQuery({ hook: 'findOne', model, connectorQuery }),
    count: wrapQuery({ hook: 'count', model, connectorQuery }),
    search: wrapQuery({ hook: 'search', model, connectorQuery }),
    countSearch: wrapQuery({ hook: 'countSearch', model, connectorQuery }),
  };
};

// wraps a connectorQuery call with:
// - param substitution
// - lifecycle hooks
const wrapQuery = ({ hook, model, connectorQuery }) => async (params, ...rest) => {
  // substite id for primaryKey value in params
  const newParams = replaceIdByPrimaryKey(params, model);

  // execute before hook
  await executeBeforeHook(hook, model, newParams, ...rest);

  // execute query
  const result = await connectorQuery[hook](newParams, ...rest);

  // execute after hook
  await executeAfterHook(hook, model, result);

  // return result
  return result;
};
