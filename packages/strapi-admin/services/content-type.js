'use strict';

const _ = require('lodash');
const fp = require('lodash/fp');

/**
 * Creates an array of permissions with the "fields" attribute filled
 * @param {string} contentTypeUid uid of a content-type or components
 * @param {Object} options
 * @param {string} options.fieldPath current path of the field
 * @param {number} options.nestingLevel level of nesting to achieve
 * @param {object} options.components components where components attributes can be found
 * @param {object} options.requiredOnly only returns required nestedFields
 * @param {object} options.existingFields fields that are already selected, meaning that some sub-fields may be required
 * @param {object} options.withIntermediate if true, the paths to the nodes will also be returned, if false, only the paths to the leaves will be returned
 * @returns {array<string>}
 */
const getNestedFields = (
  model,
  {
    prefix = '',
    nestingLevel = 15,
    components = {},
    requiredOnly = false,
    existingFields = [],
    withIntermediate = false,
  }
) => {
  if (nestingLevel === 0) {
    return prefix && !withIntermediate ? [prefix] : [];
  }

  return _.reduce(
    model.attributes,
    (fields, attr, key) => {
      const fieldPath = prefix ? `${prefix}.${key}` : key;
      const requiredOrNotNeeded = !requiredOnly || attr.required === true;
      const insideExistingFields = existingFields && existingFields.some(fp.startsWith(fieldPath));

      if (attr.type === 'component') {
        if (withIntermediate) {
          fields.push(fieldPath);
        }
        if (requiredOrNotNeeded || insideExistingFields) {
          const compoFields = getNestedFields(components[attr.component], {
            nestingLevel: nestingLevel - 1,
            prefix: fieldPath,
            components,
            requiredOnly,
            existingFields,
            withIntermediate,
          });

          if (requiredOnly && compoFields.length === 0 && attr.required) {
            return withIntermediate ? fields : fields.concat(fieldPath);
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
 * Creates an array of permissions with the "fields" attribute filled
 * @param {array} actions array of actions
 * @param {object} options
 * @param {number} options.nestingLevel level of nesting
 * @param {array} options.fieldsNullFor actionIds where the fields should be null
 * @returns {array<permissions>}
 */
const getPermissionsWithNestedFields = (actions, { nestingLevel, fieldsNullFor = [] } = {}) =>
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

/**
 * Cleans fields of permissions (add required ones, remove the non-existing anymore ones)
 * @param {object} permissions array of existing permissions in db
 * @param {object} options
 * @param {number} options.nestingLevel level of nesting
 * @param {array} options.fieldsNullFor actionIds where the fields should be null
 * @returns {array<permissions>}
 */
const cleanPermissionFields = (permissions, { nestingLevel, fieldsNullFor = [] }) =>
  permissions.map(perm => {
    let newFields = perm.fields;
    if (fieldsNullFor.includes(perm.actionId)) {
      newFields = null;
    } else if (perm.subject && strapi.contentTypes[perm.subject]) {
      const possiblefields = getNestedFields(strapi.contentTypes[perm.subject], {
        components: strapi.components,
        nestingLevel,
        withIntermediate: true,
      });

      const requiredFields = getNestedFields(strapi.contentTypes[perm.subject], {
        components: strapi.components,
        requiredOnly: true,
        nestingLevel,
        existingFields: perm.fields,
      });
      const badNestedFields = _.uniq([
        ..._.intersection(perm.fields, possiblefields),
        ...requiredFields,
      ]);
      newFields = badNestedFields.filter(
        f1 => !badNestedFields.some(f2 => f2.startsWith(`${f1}.`))
      );
    }

    return { ...perm, fields: newFields };
  }, []);

module.exports = {
  getNestedFields,
  getPermissionsWithNestedFields,
  cleanPermissionFields,
};
