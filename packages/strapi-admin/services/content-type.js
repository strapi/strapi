'use strict';

const _ = require('lodash');
const fp = require('lodash/fp');
const { contentTypes: contentTypesUtils } = require('strapi-utils');
const actionDomain = require('../domain/action');

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
      const insideExistingFields = existingFields && existingFields.some(fp.startsWith(fieldPath));

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
 * Creates an array of permissions with the "fields" attribute filled
 * @param {array} actions array of actions
 * @param {object} options
 * @param {number} options.nestingLevel level of nesting
 * @param {array} options.restrictedSubjects subjectsId to ignore
 * @returns {array<permissions>}
 */
const getPermissionsWithNestedFields = (actions, { nestingLevel, restrictedSubjects = [] } = {}) =>
  actions.reduce((perms, action) => {
    action.subjects
      .filter(subject => !restrictedSubjects.includes(subject))
      .forEach(contentTypeUid => {
        const fields = actionDomain.hasFieldsRestriction(action)
          ? getNestedFields(strapi.contentTypes[contentTypeUid], {
              components: strapi.components,
              nestingLevel,
            })
          : null;
        perms.push({
          action: action.actionId,
          subject: contentTypeUid,
          fields,
          conditions: [],
        });
      });
    return perms;
  }, []);

/**
 * Cleans fields of permissions (add required ones, remove the non-existing anymore ones)
 * @param {object} permissions array of existing permissions in db
 * @param {object} options
 * @param {number} options.nestingLevel level of nesting
 * @returns {array<permissions>}
 */
const cleanPermissionFields = (permissions, { nestingLevel } = {}) =>
  permissions.map(perm => {
    const { action: actionId, fields, subject } = perm;
    const action = strapi.admin.services.permission.actionProvider.getByActionId(actionId);

    if (!actionDomain.hasFieldsRestriction(action)) {
      return { ...perm, fields: null };
    }

    if (!subject || !strapi.contentTypes[subject]) {
      return { ...perm, fields };
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

    const badNestedFields = _.uniq([..._.intersection(fields, possibleFields), ...requiredFields]);

    const newFields = badNestedFields.filter(
      field => !badNestedFields.some(fp.startsWith(`${field}.`))
    );

    return { ...perm, fields: newFields };
  }, []);

module.exports = {
  getNestedFields,
  getPermissionsWithNestedFields,
  cleanPermissionFields,
  getNestedFieldsWithIntermediate,
};
