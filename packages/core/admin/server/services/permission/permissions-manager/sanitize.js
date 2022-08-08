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
  getOr,
} = require('lodash/fp');

const { contentTypes, traverseEntity, sanitize, pipeAsync } = require('@strapi/utils');

const { constants, getNonVisibleAttributes, getNonWritableAttributes, getWritableAttributes } =
  contentTypes;
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
      // Remove fields hidden from the admin
      traverseEntity(omitHiddenFields, { schema }),
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
      // Remove fields hidden from the admin
      traverseEntity(omitHiddenFields, { schema }),
      // Remove not allowed fields (RBAC)
      traverseEntity(allowedFields(permittedFields), { schema }),
      // Remove roles from createdBy & updateBy fields
      omitCreatorRoles
    );
  };

  const wrapSanitize = (createSanitizeFunction) => {
    const wrappedSanitize = async (data, options = {}) => {
      if (isArray(data)) {
        return Promise.all(data.map((entity) => wrappedSanitize(entity, options)));
      }

      const { subject, action: actionOverride } = getDefaultOptions(data, options);

      const permittedFields = permittedFieldsOf(ability, actionOverride, subject, {
        fieldsFrom: (rule) => rule.fields || [],
      });

      const hasAtLeastOneRegistered = some(
        (fields) => !isNil(fields),
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

  /**
   * Omit creator fields' (createdBy & updatedBy) roles from the admin API responses
   */
  const omitCreatorRoles = omit([`${CREATED_BY_ATTRIBUTE}.roles`, `${UPDATED_BY_ATTRIBUTE}.roles`]);

  /**
   * Visitor used to remove hidden fields from the admin API responses
   */
  const omitHiddenFields = ({ key, schema }, { remove }) => {
    const isHidden = getOr(false, ['config', 'attributes', key, 'hidden'], schema);

    if (isHidden) {
      remove(key);
    }
  };

  /**
   * Visitor used to only select needed fields from the admin users entities & avoid leaking sensitive information
   */
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
