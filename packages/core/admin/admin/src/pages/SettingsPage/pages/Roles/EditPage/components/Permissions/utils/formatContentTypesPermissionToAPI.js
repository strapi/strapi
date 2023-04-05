import isObject from 'lodash/isObject';
import { createArrayOfValues } from '../../utils';
import { createConditionsArray } from './formatSettingsPermissionsToAPI';

/**
 * Returns an array of property values
 * @param {object} propertyValue
 * @param {string} prefix
 * @returns {array<string>}
 */
const createPropertyArray = (propertyValue, prefix = '') => {
  return Object.entries(propertyValue).reduce((acc, current) => {
    const [name, value] = current;

    if (isObject(value)) {
      return [...acc, ...createPropertyArray(value, `${prefix}${name}.`)];
    }

    if (value && !isObject(value)) {
      acc.push(`${prefix}${name}`);
    }

    return acc;
  }, []);
};

/**
 *
 * @param {string} action
 * @param {string} subject
 * @param {object} param2
 * @config {object} conditions
 * @config {object} the name of the properties array we need to fill
 * @returns {object}
 */
const createPermissionWithProperties = (action, subject, { conditions, properties }) => {
  return Object.entries(properties).reduce(
    (acc, current) => {
      const [propertyName, propertyValue] = current;

      acc.properties[propertyName] = createPropertyArray(propertyValue);

      return acc;
    },
    { action, subject, conditions: createConditionsArray(conditions), properties: {} }
  );
};

/**
 *
 * @param {string} action The name of the action
 * @param {string} subject The name of the subject
 * @param {object} param2
 * @returns {object}
 */
const createPermissionWithoutProperties = (action, subject, { conditions }) => {
  return {
    action,
    subject,
    properties: {},
    conditions: createConditionsArray(conditions),
  };
};

/**
 *
 * @param {string} subject  The name of the subject
 * @param {object} actions The subject's actions
 * @returns {array<object>}
 */
const createSubjectPermissions = (subject, actions) => {
  const permissions = Object.entries(actions).reduce((acc, current) => {
    const [actionName, permissions] = current;
    const shouldCreatePermission = createArrayOfValues(permissions).some((val) => val);

    if (!shouldCreatePermission) {
      return acc;
    }

    if (!permissions?.properties?.enabled) {
      const createdPermissionsArray = createPermissionWithProperties(
        actionName,
        subject,
        permissions
      );

      return [...acc, createdPermissionsArray];
    }

    if (!permissions.properties.enabled) {
      return acc;
    }

    const permission = createPermissionWithoutProperties(actionName, subject, permissions);

    acc.push(permission);

    return acc;
  }, []);

  return permissions;
};

/**
 *
 * @param {object} contentTypesPermissions
 * @returns {array<object>}
 */
const formatContentTypesPermissionToAPI = (contentTypesPermissions) => {
  const permissions = Object.entries(contentTypesPermissions).reduce((allPermissions, current) => {
    const [subject, currentSubjectActions] = current;

    const permissions = createSubjectPermissions(subject, currentSubjectActions);

    return [...allPermissions, ...permissions];
  }, []);

  return permissions;
};

export default formatContentTypesPermissionToAPI;
export { createPropertyArray, createPermissionWithProperties };
