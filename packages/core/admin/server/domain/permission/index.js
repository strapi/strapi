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
  merge,
} = require('lodash/fp');

/**
 * Domain representation of a Permission (RBAC)
 * @typedef {Object} Permission
 * @property {string} [id] - The unique identifier of the permission
 * @property {string} [role] - The role associated to a permission
 * @property {string} action - The human readable name of an action
 * @property {string} properties - A set of properties used to define the permission with more granularity
 * @property {string} conditions - Conditions to check when evaluating the permission
 * @property {string} subject - The subject on which the permission should applies
 */

const permissionFields = ['id', 'action', 'subject', 'properties', 'conditions', 'role'];
const sanitizedPermissionFields = ['id', 'action', 'subject', 'properties', 'conditions'];

const sanitizePermissionFields = pick(sanitizedPermissionFields);

/**
 * Creates a permission with default values
 * @return {Permission}
 */
const getDefaultPermission = () => ({
  conditions: [],
  properties: {},
  subject: null,
});

/**
 * Returns a new permission with the given condition
 * @param {string} condition - The condition to add
 * @param {Permission} permission - The permission on which we want to add the condition
 * @return {Permission}
 */
const addCondition = curry((condition, permission) => {
  const { conditions } = permission;
  const newConditions = Array.isArray(conditions)
    ? uniq(conditions.concat(condition))
    : [condition];

  return set('conditions', newConditions, permission);
});

/**
 * Returns a new permission without the given condition
 * @param {string} condition - The condition to remove
 * @param {Permission} permission - The permission on which we want to remove the condition
 * @return {Permission}
 */
const removeCondition = curry((condition, permission) => {
  return set('conditions', remove(eq(condition), permission.conditions), permission);
});

/**
 * Gets a property or a part of a property from a permission.
 * @param {string} property - The property to get
 * @param {Permission} permission - The permission on which we want to access the property
 * @return {Permission}
 */
const getProperty = curry((property, permission) => get(`properties.${property}`, permission));

/**
 * Set a value for a given property on a new permission object
 * @param {string} property - The name of the property
 * @param {any} value - The value of the property
 * @param {Permission} permission - The permission on which we want to set the property
 * @return {Permission}
 */
const setProperty = (property, value, permission) => {
  return set(`properties.${property}`, value, permission);
};

/**
 * Returns a new permission without the given property name set
 * @param {string} property - The name of the property to delete
 * @param {Permission} permission - The permission on which we want to remove the property
 * @return {Permission}
 */
const deleteProperty = (property, permission) => omit(`properties.${property}`, permission);

/**
 * Creates a new {@link Permission} object from raw attributes. Set default values for certain fields
 * @param {Permission} attributes
 * @return {Permission}
 */
const create = (attributes) => {
  return pipe(pick(permissionFields), merge(getDefaultPermission()))(attributes);
};

/**
 * Using the given condition provider, check and remove invalid condition from the permission's condition array.
 * @param {object} provider - The condition provider used to do the checks
 * @param {Permission} permission - The condition to sanitize
 * @return {Permission}
 */
const sanitizeConditions = curry((provider, permission) => {
  if (!isArray(permission.conditions)) {
    return permission;
  }

  return permission.conditions
    .filter((condition) => !provider.has(condition))
    .reduce((perm, condition) => removeCondition(condition, perm), permission);
});

/**
 * Transform raw attributes into valid permissions using the create domain function.
 * @param {object | object[]} payload - Can either be a single object of attributes or an array of those objects.
 * @return {Permission | Permission[]}
 */
const toPermission = (payload) => (isArray(payload) ? map(create, payload) : create(payload));

module.exports = {
  addCondition,
  removeCondition,
  create,
  deleteProperty,
  permissionFields,
  getProperty,
  sanitizedPermissionFields,
  sanitizeConditions,
  sanitizePermissionFields,
  setProperty,
  toPermission,
};
