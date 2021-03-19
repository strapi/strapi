'use strict';

const {
  pipe,
  set,
  pick,
  eq,
  omit,
  remove,
  get,
  uniq,
  isArray,
  map,
  curry,
  cloneDeep,
  merge,
} = require('lodash/fp');

const permissionFields = ['id', 'action', 'subject', 'properties', 'conditions', 'role'];
const sanitizedPermissionFields = ['id', 'action', 'subject', 'properties', 'conditions'];

const sanitizePermissionFields = pick(sanitizedPermissionFields);

const getDefaultPermission = () => ({
  conditions: [],
  properties: {},
  subject: null,
});

const addCondition = curry((condition, permission) => {
  const { conditions } = permission;
  const newConditions = Array.isArray(conditions)
    ? uniq(conditions.concat(condition))
    : [condition];

  return set('conditions', newConditions, permission);
});

const removeCondition = curry((condition, permission) => {
  return set('conditions', remove(eq(condition), permission.conditions), permission);
});

const getProperty = curry((property, permission) => get(`properties.${property}`, permission));

const setProperty = (property, value, permission) => {
  return set(`properties.${property}`, value, permission);
};

const deleteProperty = (property, permission) => omit(`properties.${property}`, permission);

const create = attributes => {
  return pipe(pick(permissionFields), merge(getDefaultPermission()))(attributes);
};

const sanitizeConditions = curry((provider, permission) => {
  if (!isArray(permission.conditions)) {
    return permission;
  }

  return permission.conditions
    .filter(condition => !provider.has(condition))
    .reduce((perm, condition) => removeCondition(condition, perm), permission);
});

const toPermission = payload => (isArray(payload) ? map(create, payload) : create(payload));

const createBoundAbstractDomain = (abstractDomainFactory, permission) => {
  const instance = {
    get permission() {
      return cloneDeep(permission);
    },
  };

  Object.assign(instance, abstractDomainFactory(permission));

  return instance;
};

module.exports = {
  addCondition,
  removeCondition,
  create,
  createBoundAbstractDomain,
  deleteProperty,
  permissionFields,
  getProperty,
  sanitizedPermissionFields,
  sanitizeConditions,
  sanitizePermissionFields,
  setProperty,
  toPermission,
};
