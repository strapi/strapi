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
  pick,
  getOr,
  isObject,
  cloneDeep,
} from 'lodash/fp';

import type { UID } from '@strapi/types';

import { contentTypes, traverseEntity, sanitize, async, traverse } from '@strapi/utils';
import { ADMIN_USER_ALLOWED_FIELDS } from '../../../domain/user';

const {
  visitors: { removePassword, expandWildcardPopulate },
} = sanitize;

const {
  constants,
  isScalarAttribute,
  getNonVisibleAttributes,
  getNonWritableAttributes,
  getWritableAttributes,
} = contentTypes;
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

export default ({ action, ability, model }: any) => {
  const schema = strapi.getModel(model);

  const { removeDisallowedFields } = sanitize.visitors;

  const ctx = {
    schema,
    getModel: strapi.getModel.bind(strapi),
  };

  const createSanitizeQuery = (options = {} as any) => {
    const { fields } = options;

    // TODO: sanitize relations to admin users in all sanitizers
    const permittedFields = fields.shouldIncludeAll ? null : getQueryFields(fields.permitted);

    const sanitizeFilters = async.pipe(
      traverse.traverseQueryFilters(removeDisallowedFields(permittedFields), ctx),
      traverse.traverseQueryFilters(omitDisallowedAdminUserFields, ctx),
      traverse.traverseQueryFilters(omitHiddenFields, ctx),
      traverse.traverseQueryFilters(removePassword, ctx),
      traverse.traverseQueryFilters(({ key, value }, { remove }) => {
        if (isObject(value) && isEmpty(value)) {
          remove(key);
        }
      }, ctx)
    );

    const sanitizeSort = async.pipe(
      traverse.traverseQuerySort(removeDisallowedFields(permittedFields), ctx),
      traverse.traverseQuerySort(omitDisallowedAdminUserFields, ctx),
      traverse.traverseQuerySort(omitHiddenFields, ctx),
      traverse.traverseQuerySort(removePassword, ctx),
      traverse.traverseQuerySort(({ key, attribute, value }, { remove }) => {
        if (!isScalarAttribute(attribute) && isEmpty(value)) {
          remove(key);
        }
      }, ctx)
    );

    const sanitizePopulate = async.pipe(
      traverse.traverseQueryPopulate(expandWildcardPopulate, ctx),
      traverse.traverseQueryPopulate(removeDisallowedFields(permittedFields), ctx),
      traverse.traverseQueryPopulate(omitDisallowedAdminUserFields, ctx),
      traverse.traverseQueryPopulate(omitHiddenFields, ctx),
      traverse.traverseQueryPopulate(removePassword, ctx)
    );

    const sanitizeFields = async.pipe(
      traverse.traverseQueryFields(removeDisallowedFields(permittedFields), ctx),
      traverse.traverseQueryFields(omitHiddenFields, ctx),
      traverse.traverseQueryFields(removePassword, ctx)
    );

    return async (query: any) => {
      const sanitizedQuery = cloneDeep(query);

      if (query.filters) {
        Object.assign(sanitizedQuery, { filters: await sanitizeFilters(query.filters) });
      }

      if (query.sort) {
        Object.assign(sanitizedQuery, { sort: await sanitizeSort(query.sort) });
      }

      if (query.populate) {
        Object.assign(sanitizedQuery, { populate: await sanitizePopulate(query.populate) });
      }

      if (query.fields) {
        Object.assign(sanitizedQuery, { fields: await sanitizeFields(query.fields) });
      }

      return sanitizedQuery;
    };
  };

  const createSanitizeOutput = (options = {} as any) => {
    const { fields } = options;

    const permittedFields = fields.shouldIncludeAll ? null : getOutputFields(fields.permitted);

    return async.pipe(
      // Remove fields hidden from the admin
      traverseEntity(omitHiddenFields, ctx),
      // Remove unallowed fields from admin::user relations
      traverseEntity(pickAllowedAdminUserFields, ctx),
      // Remove not allowed fields (RBAC)
      traverseEntity(removeDisallowedFields(permittedFields), ctx),
      // Remove all fields of type 'password'
      sanitize.sanitizers.sanitizePasswords({
        schema,
        getModel(uid: string) {
          return strapi.getModel(uid as UID.Schema);
        },
      })
    );
  };

  const createSanitizeInput = (options = {} as any) => {
    const { fields } = options;

    const permittedFields = fields.shouldIncludeAll ? null : getInputFields(fields.permitted);

    return async.pipe(
      // Remove fields hidden from the admin
      traverseEntity(omitHiddenFields, ctx),
      // Remove not allowed fields (RBAC)
      traverseEntity(removeDisallowedFields(permittedFields), ctx),
      // Remove roles from createdBy & updatedBy fields
      omitCreatorRoles
    );
  };

  const wrapSanitize = (createSanitizeFunction: any) => {
    // TODO
    // @ts-expect-error define the correct return type
    const wrappedSanitize = async (data: unknown, options = {} as any) => {
      if (isArray(data)) {
        return Promise.all(data.map((entity: unknown) => wrappedSanitize(entity, options)));
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
  const omitHiddenFields = ({ key, schema }: any, { remove }: any) => {
    const isHidden = getOr(false, ['config', 'attributes', key, 'hidden'], schema);

    if (isHidden) {
      remove(key);
    }
  };

  /**
   * Visitor used to only select needed fields from the admin users entities & avoid leaking sensitive information
   */
  const pickAllowedAdminUserFields = ({ attribute, key, value }: any, { set }: any) => {
    const pickAllowedFields = pick(ADMIN_USER_ALLOWED_FIELDS);
    if (!attribute) {
      return;
    }

    if (attribute.type === 'relation' && attribute.target === 'admin::user' && value) {
      if (Array.isArray(value)) {
        set(key, value.map(pickAllowedFields));
      } else {
        set(key, pickAllowedFields(value));
      }
    }
  };

  /**
   * Visitor used to omit disallowed fields from the admin users entities & avoid leaking sensitive information
   */
  const omitDisallowedAdminUserFields = ({ key, attribute, schema }: any, { remove }: any) => {
    if (schema.uid === 'admin::user' && attribute && !ADMIN_USER_ALLOWED_FIELDS.includes(key)) {
      remove(key);
    }
  };

  const getInputFields = (fields = []) => {
    const nonVisibleAttributes = getNonVisibleAttributes(schema);
    const writableAttributes = getWritableAttributes(schema);

    const nonVisibleWritableAttributes = intersection(nonVisibleAttributes, writableAttributes);

    return uniq([...fields, ...COMPONENT_FIELDS, ...nonVisibleWritableAttributes]);
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

  const getQueryFields = (fields = []) => {
    const nonVisibleAttributes = getNonVisibleAttributes(schema);
    const writableAttributes = getWritableAttributes(schema);

    const nonVisibleWritableAttributes = intersection(nonVisibleAttributes, writableAttributes);

    return uniq([
      ...fields,
      ...STATIC_FIELDS,
      ...COMPONENT_FIELDS,
      ...nonVisibleWritableAttributes,
      CREATED_AT_ATTRIBUTE,
      UPDATED_AT_ATTRIBUTE,
      PUBLISHED_AT_ATTRIBUTE,
      CREATED_BY_ATTRIBUTE,
      UPDATED_BY_ATTRIBUTE,
    ]);
  };

  return {
    sanitizeOutput: wrapSanitize(createSanitizeOutput),
    sanitizeInput: wrapSanitize(createSanitizeInput),
    sanitizeQuery: wrapSanitize(createSanitizeQuery),
  };
};
