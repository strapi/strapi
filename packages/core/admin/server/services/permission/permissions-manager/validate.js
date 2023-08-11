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
  getOr,
  isObject,
} = require('lodash/fp');

const { contentTypes, traverseEntity, traverse, validate, pipeAsync } = require('@strapi/utils');
const { removePassword } = require('@strapi/utils').validate.visitors;
const { ADMIN_USER_ALLOWED_FIELDS } = require('../../../domain/user');

const { constants, isScalarAttribute, getNonVisibleAttributes, getWritableAttributes } =
  contentTypes;
const {
  ID_ATTRIBUTE,
  CREATED_AT_ATTRIBUTE,
  UPDATED_AT_ATTRIBUTE,
  PUBLISHED_AT_ATTRIBUTE,
  CREATED_BY_ATTRIBUTE,
  UPDATED_BY_ATTRIBUTE,
} = constants;

const COMPONENT_FIELDS = ['__component'];
const STATIC_FIELDS = [ID_ATTRIBUTE];

module.exports = ({ action, ability, model }) => {
  const schema = strapi.getModel(model);

  const { allowedFields } = validate.visitors;
  const { traverseQueryFilters, traverseQuerySort, traverseQueryFields } = traverse.traversals;

  const createValidateQuery = (options = {}) => {
    const { fields } = options;

    // TODO: validate relations to admin users in all validators
    const permittedFields = fields.shouldIncludeAll ? null : getQueryFields(fields.permitted);

    const validateFilters = pipeAsync(
      traverseQueryFilters(allowedFields(permittedFields), { schema }),
      traverseQueryFilters(omitDisallowedAdminUserFields, { schema }),
      traverseQueryFilters(removePassword, { schema }),
      traverseQueryFilters(
        ({ key, value }, { remove }) => {
          if (isObject(value) && isEmpty(value)) {
            remove(key);
          }
        },
        { schema }
      )
    );

    const validateSort = pipeAsync(
      traverseQuerySort(allowedFields(permittedFields), { schema }),
      traverseQuerySort(omitDisallowedAdminUserFields, { schema }),
      traverseQuerySort(removePassword, { schema }),
      traverseQuerySort(
        ({ key, attribute, value }, { remove }) => {
          if (!isScalarAttribute(attribute) && isEmpty(value)) {
            remove(key);
          }
        },
        { schema }
      )
    );

    // const validatePopulate = pipeAsync(
    //   traverseQueryPopulate(allowedFields(permittedFields), { schema }),
    //   traverseQueryPopulate(omitDisallowedAdminUserFields, { schema }),
    //   traverseQueryPopulate(removePassword, { schema })
    // );

    const validateFields = pipeAsync(
      traverseQueryFields(allowedFields(permittedFields), { schema }),
      traverseQueryFields(removePassword, { schema })
    );

    return async (query) => {
      if (query.filters) {
        await validateFilters(query.filters);
      }

      if (query.sort) {
        await validateSort(query.sort);
      }

      if (query.fields) {
        await validateFields(query.fields);
      }

      return true;
    };
  };

  const createValidateInput = (options = {}) => {
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

  const wrapValidate = (createSanitizeFunction) => {
    const wrappedValidate = async (data, options = {}) => {
      if (isArray(data)) {
        return Promise.all(data.map((entity) => wrappedValidate(entity, options)));
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

    return wrappedValidate;
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
   * Visitor used to omit disallowed fields from the admin users entities & avoid leaking sensitive information
   */
  const omitDisallowedAdminUserFields = ({ key, attribute, schema }, { remove }) => {
    if (schema.uid === 'admin::user' && attribute && !ADMIN_USER_ALLOWED_FIELDS.includes(key)) {
      remove(key);
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

  const getQueryFields = (fields = []) => {
    return uniq([
      ...fields,
      ...STATIC_FIELDS,
      ...COMPONENT_FIELDS,
      CREATED_AT_ATTRIBUTE,
      UPDATED_AT_ATTRIBUTE,
      PUBLISHED_AT_ATTRIBUTE,
    ]);
  };

  return {
    validateQuery: wrapValidate(createValidateQuery),
    validateInput: wrapValidate(createValidateInput),
  };
};
