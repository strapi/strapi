'use strict';

const _ = require('lodash/fp');

const PERMISSION_FIELDS = ['action', 'subject', 'properties', 'conditions'];

const sanitizePermissionFields = _.pick(PERMISSION_FIELDS);

/**
 * @typedef {import("../../..").Permission} Permission
 */

/**
 * Creates a permission with default values for optional properties
 *
 * @return {Pick<Permission, 'conditions' | 'properties' | 'subject'>}
 */
const getDefaultPermission = () => ({
  conditions: [],
  properties: {},
  subject: null,
});

/**
 * Create a new permission based on given attributes
 *
 * @param {object} attributes
 *
 * @return {Permission}
 */
const create = _.pipe(_.pick(PERMISSION_FIELDS), _.merge(getDefaultPermission()));

/**
 * Add a condition to a permission
 *
 * @param {string} condition The condition to add
 * @param {Permission} permission The permission on which we want to add the condition
 *
 * @return {Permission}
 */
const addCondition = _.curry((condition, permission) => {
  const { conditions } = permission;

  const newConditions = Array.isArray(conditions)
    ? _.uniq(conditions.concat(condition))
    : [condition];

  return _.set('conditions', newConditions, permission);
});

/**
 * Gets a property or a part of a property from a permission.
 *
 * @function
 *
 * @param {string} property - The property to get
 * @param {Permission} permission - The permission on which we want to access the property
 *
 * @return {Permission}
 */
const getProperty = _.curry((property, permission) => _.get(`properties.${property}`, permission));

module.exports = {
  create,
  sanitizePermissionFields,
  addCondition,
  getProperty,
};
