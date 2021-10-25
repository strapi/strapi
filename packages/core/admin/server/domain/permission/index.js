'use strict';

/**
 * @typedef {import('@strapi/admin').AdminPermission} AdminPermission
 */

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

const permissionFields = ['id', 'action', 'subject', 'properties', 'conditions', 'role'];
const sanitizedPermissionFields = ['id', 'action', 'subject', 'properties', 'conditions'];

const sanitizePermissionFields = pick(sanitizedPermissionFields);

/**
 * Creates a permission with default values
 */
const getDefaultPermission = () => ({
  conditions: [],
  properties: {},
  subject: null,
});

/**
 * Returns a new permission with the given condition
 * @param {string} condition - The condition to add
 * @param {AdminPermission} permission - The permission on which we want to add the condition
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
 * @param {AdminPermission=} permission - The permission on which we want to remove the condition
 */
const removeCondition = curry((condition, permission) => {
  return set('conditions', remove(eq(condition), permission.conditions), permission);
});

/**
 * Gets a property or a part of a property from a permission.
 * @param {string} property - The property to get
 * @param {AdminPermission} permission - The permission on which we want to access the property
 */
const getProperty = curry((property, permission) => get(`properties.${property}`, permission));

/**
 * Set a value for a given property on a new permission object
 * @param {string} property - The name of the property
 * @param {any} value - The value of the property
 * @param {AdminPermission} permission - The permission on which we want to set the property
 */
const setProperty = (property, value, permission) => {
  return set(`properties.${property}`, value, permission);
};

/**
 * Returns a new permission without the given property name set
 * @param {string} property - The name of the property to delete
 * @param {AdminPermission} permission - The permission on which we want to remove the property
 */
const deleteProperty = (property, permission) => omit(`properties.${property}`, permission);

/**
 * Creates a new {@link Permission} object from raw attributes. Set default values for certain fields
 * @param {AdminPermission} attributes
 */
const create = attributes => {
  return pipe(
    pick(permissionFields),
    merge(getDefaultPermission())
  )(attributes);
};

/**
 * Using the given condition provider, check and remove invalid condition from the permission's condition array.
 * @param {object} provider - The condition provider used to do the checks
 * @param {AdminPermission} permission - The condition to sanitize
 */
const sanitizeConditions = curry((provider, permission) => {
  if (!isArray(permission.conditions)) {
    return permission;
  }

  return permission.conditions
    .filter(condition => !provider.has(condition))
    .reduce((perm, condition) => removeCondition(condition, perm), permission);
});

/**
 * Transform raw attributes into valid permissions using the create domain function.
 * @param {object | object[]} payload - Can either be a single object of attributes or an array of those objects.
 */
const toPermission = payload => (isArray(payload) ? map(create, payload) : create(payload));

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
