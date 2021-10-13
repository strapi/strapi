'use strict';

const _ = require('lodash');
const { uniq, startsWith, intersection } = require('lodash/fp');
const { contentTypes: contentTypesUtils } = require('strapi-utils');
const { getService } = require('../utils');
const actionDomain = require('../domain/action');
const permissionDomain = require('../domain/permission');

/**
 * Creates an array of paths to the fields and nested fields, without path nodes
 * @param {string} model model used to get the nested fields
 * @param {Object} options
 * @param {string} options.prefix prefix to add to the path
 * @param {number} options.nestingLevel level of nesting to achieve
 * @param {object} options.components components where components attributes can be found
 * @param {object} options.requiredOnly only returns required nestedFields
 * @param {object} options.existingFields fields that are already selected, meaning that some sub-fields may be required
 * @returns {array<string>}
 * @param model
 */
const getNestedFields = (
  model,
  { prefix = '', nestingLevel = 15, components = {}, requiredOnly = false, existingFields = [] }
) => {
  if (nestingLevel === 0) {
    return prefix ? [prefix] : [];
  }

  const nonAuthorizableFields = contentTypesUtils.getNonVisibleAttributes(model);

  return _.reduce(
    model.attributes,
    (fields, attr, key) => {
      if (nonAuthorizableFields.includes(key)) return fields;

      const fieldPath = prefix ? `${prefix}.${key}` : key;
      const requiredOrNotNeeded = !requiredOnly || attr.required === true;
      const insideExistingFields = existingFields && existingFields.some(startsWith(fieldPath));

      if (attr.type === 'component') {
        if (requiredOrNotNeeded || insideExistingFields) {
          const compoFields = getNestedFields(components[attr.component], {
            nestingLevel: nestingLevel - 1,
            prefix: fieldPath,
            components,
            requiredOnly,
            existingFields,
          });

          if (requiredOnly && compoFields.length === 0 && attr.required) {
            return fields.concat(fieldPath);
          }

          return fields.concat(compoFields);
        }
        return fields;
      }

      if (requiredOrNotNeeded) {
        return fields.concat(fieldPath);
      }

      return fields;
    },
    []
  );
};

/**
 * Creates an array of paths to the fields and nested fields, with path nodes
 * @param {string} model model used to get the nested fields
 * @param {Object} options
 * @param {string} options.prefix prefix to add to the path
 * @param {number} options.nestingLevel level of nesting to achieve
 * @param {object} options.components components where components attributes can be found
 * @returns {array<string>}
 */

const getNestedFieldsWithIntermediate = (
  model,
  { prefix = '', nestingLevel = 15, components = {} }
) => {
  if (nestingLevel === 0) {
    return [];
  }

  const nonAuthorizableFields = contentTypesUtils.getNonVisibleAttributes(model);

  return _.reduce(
    model.attributes,
    (fields, attr, key) => {
      if (nonAuthorizableFields.includes(key)) return fields;

      const fieldPath = prefix ? `${prefix}.${key}` : key;
      fields.push(fieldPath);

      if (attr.type === 'component') {
        const compoFields = getNestedFieldsWithIntermediate(components[attr.component], {
          nestingLevel: nestingLevel - 1,
          prefix: fieldPath,
          components,
        });

        fields.push(...compoFields);
      }

      return fields;
    },
    []
  );
};

/**
 * Creates an array of permissions with the "properties.fields" attribute filled
 * @param {array} actions array of actions
 * @param {object} options
 * @param {number} options.nestingLevel level of nesting
 * @param {array} options.restrictedSubjects subjectsId to ignore
 * @returns {Permission[]}
 */
const getPermissionsWithNestedFields = (
  actions,
  { nestingLevel, restrictedSubjects = [] } = {}
) => {
  return actions.reduce((permissions, action) => {
    const validSubjects = action.subjects.filter(subject => !restrictedSubjects.includes(subject));

    // Create a Permission for each subject (content-type uid) within the action
    for (const subject of validSubjects) {
      const fields = actionDomain.appliesToProperty('fields', action)
        ? getNestedFields(strapi.contentTypes[subject], {
            components: strapi.components,
            nestingLevel,
          })
        : undefined;

      const permission = permissionDomain.create({
        action: action.actionId,
        subject,
        properties: { fields },
      });

      permissions.push(permission);
    }

    return permissions;
  }, []);
};

/**
 * Cleans permissions' fields (add required ones, remove the non-existing ones)
 * @param {Permission[]} permissions array of existing permissions in db
 * @param {object} options
 * @param {number} options.nestingLevel level of nesting
 * @returns {Permission[]}
 */
const cleanPermissionFields = (permissions, { nestingLevel } = {}) => {
  const { actionProvider } = getService('permission');

  return permissions.map(permission => {
    const {
      action: actionId,
      subject,
      properties: { fields },
    } = permission;

    const action = actionProvider.get(actionId);

    // todo see if it's possible to check property on action + subject (async)
    if (!actionDomain.appliesToProperty('fields', action)) {
      return permissionDomain.deleteProperty('fields', permission);
    }

    if (!subject || !strapi.contentTypes[subject]) {
      return permission;
    }

    const possibleFields = getNestedFieldsWithIntermediate(strapi.contentTypes[subject], {
      components: strapi.components,
      nestingLevel,
    });

    const requiredFields = getNestedFields(strapi.contentTypes[subject], {
      components: strapi.components,
      requiredOnly: true,
      nestingLevel,
      existingFields: fields,
    });

    const badNestedFields = uniq([...intersection(fields, possibleFields), ...requiredFields]);

    const newFields = badNestedFields.filter(
      field => !badNestedFields.some(startsWith(`${field}.`))
    );

    return permissionDomain.setProperty('fields', newFields, permission);
  }, []);
};

module.exports = {
  getNestedFields,
  getPermissionsWithNestedFields,
  cleanPermissionFields,
  getNestedFieldsWithIntermediate,
};
