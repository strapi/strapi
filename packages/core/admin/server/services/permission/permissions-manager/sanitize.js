'use strict';

const { subject: asSubject, detectSubjectType } = require('@casl/ability');
const { permittedFieldsOf } = require('@casl/ability/extra');
const {
  defaults,
  omit,
  isArray,
  isEmpty,
  isNil,
  flatMap,
  some,
  prop,
  uniq,
  intersection,
  pick,
} = require('lodash/fp');

const { contentTypes, traverseEntity, sanitize, pipeAsync } = require('@strapi/utils');

const {
  constants,
  getNonVisibleAttributes,
  getNonWritableAttributes,
  getWritableAttributes,
} = contentTypes;
const {
  ID_ATTRIBUTE,
  CREATED_AT_ATTRIBUTE,
  UPDATED_AT_ATTRIBUTE,
  CREATED_BY_ATTRIBUTE,
  UPDATED_BY_ATTRIBUTE,
} = constants;

const COMPONENT_FIELDS = ['__component'];
const STATIC_FIELDS = [ID_ATTRIBUTE];

module.exports = ({ action, ability, model }) => {
  const schema = strapi.getModel(model);

  const { allowedFields } = sanitize.visitors;

  const createSanitizeOutput = (options = {}) => {
    const { fields } = options;

    const permittedFields = fields.shouldIncludeAll ? null : getOutputFields(fields.permitted);

    return pipeAsync(
      // Remove unallowed fields from admin::user relations
      traverseEntity(pickAllowedAdminUserFields, { schema }),
      // Remove not allowed fields (RBAC)
      traverseEntity(allowedFields(permittedFields), { schema }),
      // Remove all fields of type 'password'
      sanitize.sanitizers.sanitizePasswords(schema)
    );
  };

  const createSanitizeInput = (options = {}) => {
    const { fields } = options;

    const permittedFields = fields.shouldIncludeAll ? null : getInputFields(fields.permitted);

    return pipeAsync(
      // Remove not allowed fields (RBAC)
      traverseEntity(allowedFields(permittedFields), { schema }),
      // Remove roles from createdBy & updateBy fields
      omitCreatorRoles
    );
  };

  const wrapSanitize = createSanitizeFunction => {
    const wrappedSanitize = async (data, options = {}) => {
      if (isArray(data)) {
        return Promise.all(data.map(entity => wrappedSanitize(entity, options)));
      }

      const { subject, action: actionOverride } = getDefaultOptions(data, options);

      // Since 5.1.0:
      // CASL knows nothing about shapes of our entities, so the only way to tell him is to provide a fieldsFrom function.
      // This function should return a list of fields from rule. Rule has no fields if it's allowed (or disallowed) to manage all of them.
      // In this case, we return all fields, otherwise return what is inside our rule.
      // References:
      // https://github.com/stalniy/casl/blob/master/packages/casl-ability/CHANGELOG.md#breaking-changes
      // https://casl.js.org/v5/en/guide/restricting-fields#field-patterns

      // The empty array in (rule => rule.fields || []) is neccesary to keep the code stable
      // meaning that the logic in place is already prepared to act upon
      // getting an empty array when the action is referred to managed "all" the fields of an entity.

      // @casl/ability@^5.1.0 won't allowed an undefined formFields when calling permittedFieldsOf.

      const permittedFields = permittedFieldsOf(ability, actionOverride, subject, {
        fieldsFrom: rule => rule.fields || [],
      });

      // Since 5.1.0:
      // "rulesFor" now expects a string with the subject type now. No more an object.
      // References:
      // https://github.com/stalniy/casl/blob/master/packages/casl-ability/CHANGELOG.md#breaking-changes
      // https://casl.js.org/v5/en/guide/subject-type-detection#custom-subject-type-detection
      // https://casl.js.org/v5/en/api/casl-ability

      const hasAtLeastOneRegistered = some(
        fields => !isNil(fields),
        flatMap(prop('fields'), ability.rulesFor(actionOverride, detectSubjectType(subject)))
      );
      const shouldIncludeAllFields = isEmpty(permittedFields) && !hasAtLeastOneRegistered;

      const sanitizeOptions = {
        ...options,
        fields: {
          shouldIncludeAll: shouldIncludeAllFields,
          permitted: permittedFields,
          hasAtLeastOneRegistered,
        },
      };

      const sanitizeFunction = createSanitizeFunction(sanitizeOptions);

      return sanitizeFunction(data);
    };

    return wrappedSanitize;
  };

  const getDefaultOptions = (data, options) => {
    return defaults({ subject: asSubject(model, data), action }, options);
  };

  const omitCreatorRoles = omit([`${CREATED_BY_ATTRIBUTE}.roles`, `${UPDATED_BY_ATTRIBUTE}.roles`]);

  const pickAllowedAdminUserFields = ({ attribute, key, value }, { set }) => {
    const pickAllowedFields = pick(['id', 'firstname', 'lastname', 'username']);

    if (attribute.type === 'relation' && attribute.target === 'admin::user' && value) {
      if (Array.isArray(value)) {
        set(key, value.map(pickAllowedFields));
      } else {
        set(key, pickAllowedFields(value));
      }
    }
  };

  const getInputFields = (fields = []) => {
    const nonVisibleAttributes = getNonVisibleAttributes(schema);
    const writableAttributes = getWritableAttributes(schema);

    const nonVisibleWritableAttributes = intersection(nonVisibleAttributes, writableAttributes);

    return uniq([
      ...fields,
      ...STATIC_FIELDS,
      ...COMPONENT_FIELDS,
      ...nonVisibleWritableAttributes,
    ]);
  };

  const getOutputFields = (fields = []) => {
    const nonWritableAttributes = getNonWritableAttributes(schema);
    const nonVisibleAttributes = getNonVisibleAttributes(schema);

    return uniq([
      ...fields,
      ...STATIC_FIELDS,
      ...COMPONENT_FIELDS,
      ...nonWritableAttributes,
      ...nonVisibleAttributes,
      CREATED_AT_ATTRIBUTE,
      UPDATED_AT_ATTRIBUTE,
    ]);
  };

  return {
    sanitizeOutput: wrapSanitize(createSanitizeOutput),
    sanitizeInput: wrapSanitize(createSanitizeInput),
  };
};
