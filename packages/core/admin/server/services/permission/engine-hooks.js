'use strict';

const { cloneDeep, has } = require('lodash/fp');
const { hooks } = require('@strapi/utils');

const permissionDomain = require('../../domain/permission');

/**
 * Create a hook map used by the permission Engine
 */
const createEngineHooks = () => ({
  willEvaluatePermission: hooks.createAsyncSeriesHook(),
  willRegisterPermission: hooks.createAsyncSeriesHook(),
});

/**
 * Create a context from a domain {@link Permission} used by the WillEvaluate hook
 * @param {Permission} permission
 * @return {{readonly permission: Permission, addCondition(string): this}}
 */
const createWillEvaluateContext = permission => ({
  get permission() {
    return cloneDeep(permission);
  },

  addCondition(condition) {
    Object.assign(permission, permissionDomain.addCondition(condition, permission));

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
const createWillRegisterContext = (caslPermission, { permission, user }) => ({
  get permission() {
    return cloneDeep(permission);
  },

  get user() {
    return cloneDeep(user);
  },

  condition: {
    and(rawConditionObject) {
      if (!caslPermission.condition) {
        Object.assign(caslPermission, { condition: { $and: [] } });
      }

      caslPermission.condition.$and.push(rawConditionObject);

      return this;
    },

    or(rawConditionObject) {
      if (!caslPermission.condition) {
        Object.assign(caslPermission, { condition: { $and: [] } });
      }

      const orClause = caslPermission.condition.$and.find(has('$or'));

      if (orClause) {
        orClause.$or.push(rawConditionObject);
      } else {
        caslPermission.condition.$and.push({ $or: [rawConditionObject] });
      }

      return this;
    },
  },
});

module.exports = {
  createEngineHooks,
  createWillEvaluateContext,
  createWillRegisterContext,
};
