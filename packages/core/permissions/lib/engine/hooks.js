'use strict';

const { cloneDeep, has } = require('lodash/fp');
const { hooks } = require('@strapi/utils');

const domain = require('../domain');

/**
 * Create a hook map used by the permission Engine
 *
 * @return {import('../..').PermissionEngineHooks}
 */
const createEngineHooks = () => ({
  'before-format::validate.permission': hooks.createAsyncBailHook(),
  'format.permission': hooks.createAsyncSeriesWaterfallHook(),
  'after-format::validate.permission': hooks.createAsyncBailHook(),
  'before-evaluate.permission': hooks.createAsyncSeriesHook(),
  'before-register.permission': hooks.createAsyncSeriesHook(),
});

/**
 * Create a context from a domain {@link Permission} used by the validate hooks
 * @param {Permission} permission
 * @return {{ readonly permission: Permission }}
 */
const createValidateContext = (permission) => ({
  get permission() {
    return cloneDeep(permission);
  },
});

/**
 * Create a context from a domain {@link Permission} used by the before valuate hook
 * @param {Permission} permission
 * @return {{readonly permission: Permission, addCondition(string): this}}
 */
const createBeforeEvaluateContext = (permission) => ({
  get permission() {
    return cloneDeep(permission);
  },

  addCondition(condition) {
    Object.assign(permission, domain.permission.addCondition(condition, permission));

    return this;
  },
});

/**
 * Create a context from a casl Permission & some options
 * @param caslPermission
 * @param {object} options
 * @param {Permission} options.permission
 * @param {object} options.user
 */
const createWillRegisterContext = ({ permission, options }) => ({
  ...options,

  get permission() {
    return cloneDeep(permission);
  },

  condition: {
    and(rawConditionObject) {
      if (!permission.condition) {
        Object.assign(permission, { condition: { $and: [] } });
      }

      permission.condition.$and.push(rawConditionObject);

      return this;
    },

    or(rawConditionObject) {
      if (!permission.condition) {
        Object.assign(permission, { condition: { $and: [] } });
      }

      const orClause = permission.condition.$and.find(has('$or'));

      if (orClause) {
        orClause.$or.push(rawConditionObject);
      } else {
        permission.condition.$and.push({ $or: [rawConditionObject] });
      }

      return this;
    },
  },
});

module.exports = {
  createEngineHooks,
  createValidateContext,
  createBeforeEvaluateContext,
  createWillRegisterContext,
};
