'use strict';

const _ = require('lodash');

/**
 * Creates an array of permissions with the "fields" attribute filled
 * @param {string} contentTypeUid uid of a content-type or components
 * @param {Object} options
 * @param {string} options.fieldPath current path of the field
 * @param {number} options.nestingLevel level of nesting to achieve
 * @param {object} options.components cotent-types and component where "contentTypeUid" can be found
 * @returns {array<string>}
 */
const getNestedFields = (model, { fieldPath = '', nestingLevel = 3, components = {} }) => {
  if (nestingLevel === 0) {
    return fieldPath ? [fieldPath] : [];
  }

  return _.reduce(
    model.attributes,
    (fields, attribute, attributeName) => {
      const newFieldPath = fieldPath ? `${fieldPath}.${attributeName}` : attributeName;

      if (attribute.type !== 'component') {
        return fields.concat([newFieldPath]);
      } else {
        const componentFields = getNestedFields(components[attribute.component], {
          fieldPath: newFieldPath,
          nestingLevel: nestingLevel - 1,
          components,
        });
        return fields.concat(componentFields);
      }
    },
    []
  );
};

/**
 * Creates an array of permissions with the "fields" attribute filled
 * @param {array} actions array of actions
 * @param {number} nestingLevel level of nesting
 * @returns {array<permissions>}
 */
const getPermissionsWithNestedFields = (actions, nestingLevel = 3, { fieldsNullFor = [] } = {}) =>
  actions.reduce((perms, action) => {
    action.subjects.forEach(contentTypeUid => {
      const fields = fieldsNullFor.includes(action.actionId)
        ? null
        : getNestedFields(strapi.contentTypes[contentTypeUid], {
            components: strapi.components,
            nestingLevel,
          });
      perms.push({
        action: action.actionId,
        subject: contentTypeUid,
        fields,
        conditions: [],
      });
    });
    return perms;
  }, []);

module.exports = {
  getNestedFields,
  getPermissionsWithNestedFields,
};
