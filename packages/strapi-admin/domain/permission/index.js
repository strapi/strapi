'use strict';

const {
  pipe,
  set,
  pick,
  eq,
  omit,
  remove,
  uniq,
  isArray,
  map,
  curry,
  cloneDeep,
  merge,
} = require('lodash/fp');

const permissionFields = ['id', 'action', 'subject', 'properties', 'conditions', 'role'];
const getSanitizedPermissionFields = () => ['id', 'action', 'subject', 'properties', 'conditions'];

const sanitizePermissionFields = pick(getSanitizedPermissionFields());

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

const setProperty = (property, value, permission) => {
  return set(`properties.${property}`, value, permission);
};

const deleteProperty = (property, permission) => omit(`properties.${property}`, permission);

const create = attributes => {
  return pipe(pick(permissionFields), merge(getDefaultPermission()))(attributes);
};

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
  getSanitizedPermissionFields,
  sanitizePermissionFields,
  setProperty,
  toPermission,
};
