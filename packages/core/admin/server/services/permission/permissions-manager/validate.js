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

const {
  contentTypes,
  traverseEntity,
  traverse,
  validate,
  pipeAsync,
  ValidationError,
} = require('@strapi/utils');

const { throwPassword, throwDisallowedFields } = validate.visitors;
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

const throwInvalidParam = ({ key }) => {
  throw new ValidationError(`Invalid param ${key}`);
};

module.exports = ({ action, ability, model }) => {
  const schema = strapi.getModel(model);

  const { traverseQueryFilters, traverseQuerySort, traverseQueryFields } = traverse.traversals;

  const createValidateQuery = (options = {}) => {
    const { fields } = options;

    // TODO: validate relations to admin users in all validators
    const permittedFields = fields.shouldIncludeAll ? null : getQueryFields(fields.permitted);

    const validateFilters = pipeAsync(
      traverseQueryFilters(throwDisallowedFields(permittedFields), { schema }),
      traverseQueryFilters(throwDisallowedAdminUserFields, { schema }),
      traverseQueryFilters(throwPassword, { schema }),
      traverseQueryFilters(
        ({ key, value }) => {
          if (isObject(value) && isEmpty(value)) {
            throwInvalidParam({ key });
          }
        },
        { schema }
      )
    );

    const validateSort = pipeAsync(
      traverseQuerySort(throwDisallowedFields(permittedFields), { schema }),
      traverseQuerySort(throwDisallowedAdminUserFields, { schema }),
      traverseQuerySort(throwPassword, { schema }),
      traverseQuerySort(
        ({ key, attribute, value }) => {
          if (!isScalarAttribute(attribute) && isEmpty(value)) {
            throwInvalidParam({ key });
          }
        },
        { schema }
      )
    );

    const validateFields = pipeAsync(
      traverseQueryFields(throwDisallowedFields(permittedFields), { schema }),
      traverseQueryFields(throwPassword, { schema })
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
      traverseEntity(throwHiddenFields, { schema }),
      // Remove not allowed fields (RBAC)
      traverseEntity(throwDisallowedFields(permittedFields), { schema }),
      // Remove roles from createdBy & updatedBy fields
      omitCreatorRoles
    );
  };

  const wrapValidate = (createValidateFunction) => {
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

      const validateOptions = {
        ...options,
        fields: {
          shouldIncludeAll: shouldIncludeAllFields,
          permitted: permittedFields,
          hasAtLeastOneRegistered,
        },
      };

      const sanitizeFunction = createValidateFunction(validateOptions);

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
  const throwHiddenFields = ({ key, schema }) => {
    const isHidden = getOr(false, ['config', 'attributes', key, 'hidden'], schema);

    if (isHidden) {
      throwInvalidParam({ key });
    }
  };

  /**
   * Visitor used to omit disallowed fields from the admin users entities & avoid leaking sensitive information
   */
  const throwDisallowedAdminUserFields = ({ key, attribute, schema }) => {
    if (schema.uid === 'admin::user' && attribute && !ADMIN_USER_ALLOWED_FIELDS.includes(key)) {
      throwInvalidParam({ key });
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
