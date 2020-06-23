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
const getNestedFields = (contentTypeUid, { fieldPath = '', nestingLevel = 3, components = {} }) => {
  if (nestingLevel === 0) {
    return fieldPath ? [fieldPath] : [];
  }
  if (!components[contentTypeUid]) {
    throw new Error(`${contentTypeUid} doesn't exist`);
  }

  return _.reduce(
    components[contentTypeUid].attributes,
    (fields, attribute, attributeName) => {
      const newFieldPath = fieldPath ? `${fieldPath}.${attributeName}` : attributeName;

      if (attribute.type !== 'component') {
        return fields.concat([newFieldPath]);
      } else {
        const componentFields = getNestedFields(components[attribute.component].uid, {
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
const getPermissionsWithNestedFields = (actions, nestingLevel = 3) =>
  actions.reduce((perms, action) => {
    action.subjects.forEach(contentTypeUid => {
      const fields = getNestedFields(contentTypeUid, {
        components: { ...strapi.components, ...strapi.contentTypes },
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
