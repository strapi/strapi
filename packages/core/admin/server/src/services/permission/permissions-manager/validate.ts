import { subject as asSubject, detectSubjectType } from '@casl/ability';
import { permittedFieldsOf } from '@casl/ability/extra';
import {
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
} from 'lodash/fp';

import { contentTypes, traverseEntity, traverse, validate, async, errors } from '@strapi/utils';
import { ADMIN_USER_ALLOWED_FIELDS } from '../../../domain/user';

const { ValidationError } = errors;
const { throwPassword, throwDisallowedFields } = validate.visitors;

const { constants, isScalarAttribute, getNonVisibleAttributes, getWritableAttributes } =
  contentTypes;
const {
  ID_ATTRIBUTE,
  DOC_ID_ATTRIBUTE,
  CREATED_AT_ATTRIBUTE,
  UPDATED_AT_ATTRIBUTE,
  PUBLISHED_AT_ATTRIBUTE,
  CREATED_BY_ATTRIBUTE,
  UPDATED_BY_ATTRIBUTE,
} = constants;

const COMPONENT_FIELDS = ['__component'];

const STATIC_FIELDS = [ID_ATTRIBUTE, DOC_ID_ATTRIBUTE];

const throwInvalidKey = ({ key, path }: { key: string; path?: string | null }) => {
  const msg = path && path !== key ? `Invalid key ${key} at ${path}` : `Invalid key ${key}`;

  throw new ValidationError(msg);
};

export default ({ action, ability, model }: any) => {
  const schema = strapi.getModel(model);

  const ctx = {
    schema,
    getModel: strapi.getModel.bind(strapi),
  };

  const createValidateQuery = (options = {} as any) => {
    const { fields } = options;

    // TODO: validate relations to admin users in all validators
    const permittedFields = fields.shouldIncludeAll ? null : getQueryFields(fields.permitted);

    const validateFilters = async.pipe(
      traverse.traverseQueryFilters(throwDisallowedFields(permittedFields), ctx),
      traverse.traverseQueryFilters(throwDisallowedAdminUserFields, ctx),
      traverse.traverseQueryFilters(throwPassword, ctx),
      traverse.traverseQueryFilters(({ key, value, path }) => {
        if (isObject(value) && isEmpty(value)) {
          throwInvalidKey({ key, path: path.attribute });
        }
      }, ctx)
    );

    const validateSort = async.pipe(
      traverse.traverseQuerySort(throwDisallowedFields(permittedFields), ctx),
      traverse.traverseQuerySort(throwDisallowedAdminUserFields, ctx),
      traverse.traverseQuerySort(throwPassword, ctx),
      traverse.traverseQuerySort(({ key, attribute, value, path }) => {
        if (!isScalarAttribute(attribute) && isEmpty(value)) {
          throwInvalidKey({ key, path: path.attribute });
        }
      }, ctx)
    );

    const validateFields = async.pipe(
      traverse.traverseQueryFields(throwDisallowedFields(permittedFields), ctx),
      traverse.traverseQueryFields(throwPassword, ctx)
    );

    const validatePopulate = async.pipe(
      traverse.traverseQueryPopulate(throwDisallowedFields(permittedFields), ctx),
      traverse.traverseQueryPopulate(throwDisallowedAdminUserFields, ctx),
      traverse.traverseQueryPopulate(throwHiddenFields, ctx),
      traverse.traverseQueryPopulate(throwPassword, ctx)
    );

    return async (query: any) => {
      if (query.filters) {
        await validateFilters(query.filters);
      }

      if (query.sort) {
        await validateSort(query.sort);
      }

      if (query.fields) {
        await validateFields(query.fields);
      }

      // a wildcard is always valid; its conversion will be handled by the entity service and can be optimized with sanitizer
      if (query.populate && query.populate !== '*') {
        await validatePopulate(query.populate);
      }

      return true;
    };
  };

  const createValidateInput = (options = {} as any) => {
    const { fields } = options;

    const permittedFields = fields.shouldIncludeAll ? null : getInputFields(fields.permitted);

    return async.pipe(
      // Remove fields hidden from the admin
      traverseEntity(throwHiddenFields, ctx),
      // Remove not allowed fields (RBAC)
      traverseEntity(throwDisallowedFields(permittedFields), ctx),
      // Remove roles from createdBy & updatedBy fields
      omitCreatorRoles
    );
  };

  const wrapValidate = (createValidateFunction: any) => {
    // TODO
    // @ts-expect-error define the correct return type
    const wrappedValidate = async (data, options = {}): Promise<unknown> => {
      if (isArray(data)) {
        return Promise.all(data.map((entity: unknown) => wrappedValidate(entity, options)));
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

      const validateFunction = createValidateFunction(validateOptions);

      return validateFunction(data);
    };

    return wrappedValidate;
  };

  const getDefaultOptions = (data: any, options: unknown) => {
    return defaults({ subject: asSubject(model, data), action }, options);
  };

  /**
   * Omit creator fields' (createdBy & updatedBy) roles from the admin API responses
   */
  const omitCreatorRoles = omit([`${CREATED_BY_ATTRIBUTE}.roles`, `${UPDATED_BY_ATTRIBUTE}.roles`]);

  /**
   * Visitor used to remove hidden fields from the admin API responses
   */
  const throwHiddenFields = ({ key, schema, path }: any) => {
    const isHidden = getOr(false, ['config', 'attributes', key, 'hidden'], schema);

    if (isHidden) {
      throwInvalidKey({ key, path: path.attribute });
    }
  };

  /**
   * Visitor used to omit disallowed fields from the admin users entities & avoid leaking sensitive information
   */
  const throwDisallowedAdminUserFields = ({ key, attribute, schema, path }: any) => {
    if (schema.uid === 'admin::user' && attribute && !ADMIN_USER_ALLOWED_FIELDS.includes(key)) {
      throwInvalidKey({ key, path: path.attribute });
    }
  };

  const getInputFields = (fields = []) => {
    const nonVisibleAttributes = getNonVisibleAttributes(schema);
    const writableAttributes = getWritableAttributes(schema);

    const nonVisibleWritableAttributes = intersection(nonVisibleAttributes, writableAttributes);

    return uniq([...fields, ...COMPONENT_FIELDS, ...nonVisibleWritableAttributes]);
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
