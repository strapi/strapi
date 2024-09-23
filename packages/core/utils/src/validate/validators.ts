import { isEmpty, isNil, isObject } from 'lodash/fp';

import { pipe as pipeAsync } from '../async';
import traverseEntity from '../traverse-entity';
import { isScalarAttribute, constants } from '../content-types';
import {
  traverseQueryFilters,
  traverseQuerySort,
  traverseQueryFields,
  traverseQueryPopulate,
} from '../traverse';
import { throwPassword, throwPrivate, throwDynamicZones, throwMorphToRelations } from './visitors';
import { isOperator } from '../operators';
import { asyncCurry, throwInvalidKey } from './utils';
import type { Model, Data } from '../types';
import parseType from '../parse-type';

const { ID_ATTRIBUTE, DOC_ID_ATTRIBUTE } = constants;

interface Context {
  schema: Model;
  getModel: (model: string) => Model;
}

export const throwPasswords = (ctx: Context) => async (entity: Data) => {
  if (!ctx.schema) {
    throw new Error('Missing schema in throwPasswords');
  }

  return traverseEntity(throwPassword, ctx, entity);
};

type AnyFunc = (...args: any[]) => any;

export const FILTER_TRAVERSALS = [
  'nonAttributesOperators',
  'dynamicZones',
  'morphRelations',
  'passwords',
  'private',
];

export const validateFilters = asyncCurry(
  async (ctx: Context, filters: unknown, include: (typeof FILTER_TRAVERSALS)[number][]) => {
    // TODO: schema checks should check that it is a valid schema with yup
    if (!ctx.schema) {
      throw new Error('Missing schema in defaultValidateFilters');
    }

    // Build the list of functions conditionally
    const functionsToApply: Array<AnyFunc> = [];

    // keys that are not attributes or valid operators
    if (include.includes('nonAttributesOperators')) {
      functionsToApply.push(
        traverseQueryFilters(({ key, attribute, path }) => {
          // ID is not an attribute per se, so we need to make
          // an extra check to ensure we're not removing it
          if ([ID_ATTRIBUTE, DOC_ID_ATTRIBUTE].includes(key)) {
            return;
          }

          const isAttribute = !!attribute;

          if (!isAttribute && !isOperator(key)) {
            throwInvalidKey({ key, path: path.attribute });
          }
        }, ctx)
      );
    }

    if (include.includes('dynamicZones')) {
      functionsToApply.push(traverseQueryFilters(throwDynamicZones, ctx));
    }

    if (include.includes('morphRelations')) {
      functionsToApply.push(traverseQueryFilters(throwMorphToRelations, ctx));
    }

    if (include.includes('passwords')) {
      functionsToApply.push(traverseQueryFilters(throwPassword, ctx));
    }

    if (include.includes('private')) {
      functionsToApply.push(traverseQueryFilters(throwPrivate, ctx));
    }

    // Return directly if no validation functions are provided
    if (functionsToApply.length === 0) {
      return filters;
    }

    return pipeAsync(...functionsToApply)(filters);
  }
);

export const defaultValidateFilters = asyncCurry(async (ctx: Context, filters: unknown) => {
  return validateFilters(ctx, filters, FILTER_TRAVERSALS);
});

export const SORT_TRAVERSALS = [
  'nonAttributesOperators',
  'dynamicZones',
  'morphRelations',
  'passwords',
  'private',
  'nonScalarEmptyKeys',
];

export const validateSort = asyncCurry(
  async (ctx: Context, sort: unknown, include: (typeof SORT_TRAVERSALS)[number][]) => {
    if (!ctx.schema) {
      throw new Error('Missing schema in defaultValidateSort');
    }

    // Build the list of functions conditionally based on the include array
    const functionsToApply: Array<AnyFunc> = [];

    // Validate non attribute keys
    if (include.includes('nonAttributesOperators')) {
      functionsToApply.push(
        traverseQuerySort(({ key, attribute, path }) => {
          // ID is not an attribute per se, so we need to make
          // an extra check to ensure we're not removing it
          if ([ID_ATTRIBUTE, DOC_ID_ATTRIBUTE].includes(key)) {
            return;
          }

          if (!attribute) {
            throwInvalidKey({ key, path: path.attribute });
          }
        }, ctx)
      );
    }

    // Validate dynamic zones from sort
    if (include.includes('dynamicZones')) {
      functionsToApply.push(traverseQuerySort(throwDynamicZones, ctx));
    }

    // Validate morphTo relations from sort
    if (include.includes('morphRelations')) {
      functionsToApply.push(traverseQuerySort(throwMorphToRelations, ctx));
    }

    // Validate passwords from sort
    if (include.includes('passwords')) {
      functionsToApply.push(traverseQuerySort(throwPassword, ctx));
    }

    // Validate private from sort
    if (include.includes('private')) {
      functionsToApply.push(traverseQuerySort(throwPrivate, ctx));
    }

    // Validate non-scalar empty keys
    if (include.includes('nonScalarEmptyKeys')) {
      functionsToApply.push(
        traverseQuerySort(({ key, attribute, value, path }) => {
          // ID is not an attribute per se, so we need to make
          // an extra check to ensure we're not removing it
          if ([ID_ATTRIBUTE, DOC_ID_ATTRIBUTE].includes(key)) {
            return;
          }

          if (!isScalarAttribute(attribute) && isEmpty(value)) {
            throwInvalidKey({ key, path: path.attribute });
          }
        }, ctx)
      );
    }

    // Return directly if no validation functions are provided
    if (functionsToApply.length === 0) {
      return sort;
    }

    return pipeAsync(...functionsToApply)(sort);
  }
);

export const defaultValidateSort = asyncCurry(async (ctx: Context, sort: unknown) => {
  return validateSort(ctx, sort, SORT_TRAVERSALS);
});

export const FIELDS_TRAVERSALS = ['scalarAttributes', 'privateFields', 'passwordFields'];

export const validateFields = asyncCurry(
  async (ctx: Context, fields: unknown, include: (typeof FIELDS_TRAVERSALS)[number][]) => {
    if (!ctx.schema) {
      throw new Error('Missing schema in defaultValidateFields');
    }
    // Build the list of functions conditionally based on the include array
    const functionsToApply: Array<AnyFunc> = [];

    // Only allow scalar attributes
    if (include.includes('scalarAttributes')) {
      functionsToApply.push(
        traverseQueryFields(({ key, attribute, path }) => {
          // ID is not an attribute per se, so we need to make
          // an extra check to ensure we're not throwing because of it
          if ([ID_ATTRIBUTE, DOC_ID_ATTRIBUTE].includes(key)) {
            return;
          }

          if (isNil(attribute) || !isScalarAttribute(attribute)) {
            throwInvalidKey({ key, path: path.attribute });
          }
        }, ctx)
      );
    }

    // Private fields
    if (include.includes('privateFields')) {
      functionsToApply.push(traverseQueryFields(throwPrivate, ctx));
    }

    // Password fields
    if (include.includes('passwordFields')) {
      functionsToApply.push(traverseQueryFields(throwPassword, ctx));
    }

    // Return directly if no validation functions are provided
    if (functionsToApply.length === 0) {
      return fields;
    }

    return pipeAsync(...functionsToApply)(fields);
  }
);

export const defaultValidateFields = asyncCurry(async (ctx: Context, fields: unknown) => {
  return validateFields(ctx, fields, FIELDS_TRAVERSALS);
});

export const POPULATE_TRAVERSALS = ['nonAttributesOperators', 'private'];

export const validatePopulate = asyncCurry(
  async (
    ctx: Context,
    populate: unknown,
    includes: {
      fields?: (typeof FIELDS_TRAVERSALS)[number][];
      sort?: (typeof SORT_TRAVERSALS)[number][];
      filters?: (typeof FILTER_TRAVERSALS)[number][];
      populate?: (typeof POPULATE_TRAVERSALS)[number][];
    }
  ) => {
    if (!ctx.schema) {
      throw new Error('Missing schema in defaultValidatePopulate');
    }
    // Build the list of functions conditionally based on the include array
    const functionsToApply: Array<AnyFunc> = [];

    // Always include the main traversal function
    functionsToApply.push(
      traverseQueryPopulate(async ({ key, path, value, schema, attribute, getModel }, { set }) => {
        if (attribute) {
          const isPopulatableAttribute = ['relation', 'dynamiczone', 'component', 'media'].includes(
            attribute.type
          );

          // Throw on non-populate attributes
          if (!isPopulatableAttribute) {
            throwInvalidKey({ key, path: path.raw });
          }

          // Valid populatable attribute, so return
          return;
        }

        // If we're looking at a populate fragment, ensure its target is valid
        if (key === 'on') {
          // Populate fragment should always be an object
          if (!isObject(value)) {
            return throwInvalidKey({ key, path: path.raw });
          }

          const targets = Object.keys(value);

          for (const target of targets) {
            const model = getModel(target);

            // If a target is invalid (no matching model), then raise an error
            if (!model) {
              throwInvalidKey({ key: target, path: `${path.raw}.${target}` });
            }
          }

          // If the fragment's target is fine, then let it pass
          return;
        }

        // Ignore plain wildcards
        if (key === '' && value === '*') {
          return;
        }

        // Ensure count is a boolean
        if (key === 'count') {
          try {
            parseType({ type: 'boolean', value });
            return;
          } catch {
            throwInvalidKey({ key, path: path.attribute });
          }
        }

        // Allowed boolean-like keywords should be ignored
        try {
          parseType({ type: 'boolean', value: key });
          // Key is an allowed boolean-like keyword, skipping validation...
          return;
        } catch {
          // Continue, because it's not a boolean-like
        }

        // Handle nested `sort` validation with custom or default traversals
        if (key === 'sort') {
          set(
            key,
            await validateSort(
              {
                schema,
                getModel,
              },
              value, // pass the sort value
              includes?.sort || SORT_TRAVERSALS
            )
          );
          return;
        }

        // Handle nested `filters` validation with custom or default traversals
        if (key === 'filters') {
          set(
            key,
            await validateFilters(
              {
                schema,
                getModel,
              },
              value, // pass the filters value
              includes?.filters || FILTER_TRAVERSALS
            )
          );
          return;
        }

        // Handle nested `fields` validation with custom or default traversals
        if (key === 'fields') {
          set(
            key,
            await validateFields(
              {
                schema,
                getModel,
              },
              value, // pass the fields value
              includes?.fields || FIELDS_TRAVERSALS
            )
          );
          return;
        }

        // Handle recursive nested `populate` validation with the same include object
        if (key === 'populate') {
          set(
            key,
            await validatePopulate(
              {
                schema,
                getModel,
              },
              value, // pass the nested populate value
              includes // pass down the same includes object
            )
          );
          return;
        }

        // Throw an error if non-attribute operators are included in the populate array
        if (includes?.populate?.includes('nonAttributesOperators')) {
          throwInvalidKey({ key, path: path.attribute });
        }
      }, ctx)
    );

    // Conditionally traverse for private fields only if 'private' is included
    if (includes?.populate?.includes('private')) {
      functionsToApply.push(traverseQueryPopulate(throwPrivate, ctx));
    }

    // Return directly if no validation functions are provided
    if (functionsToApply.length === 0) {
      return populate;
    }

    return pipeAsync(...functionsToApply)(populate);
  }
);

export const defaultValidatePopulate = asyncCurry(async (ctx: Context, populate: unknown) => {
  if (!ctx.schema) {
    throw new Error('Missing schema in defaultValidatePopulate');
  }

  // Call validatePopulate and include all validations by passing in full traversal arrays
  return validatePopulate(ctx, populate, {
    filters: FILTER_TRAVERSALS,
    sort: SORT_TRAVERSALS,
    fields: FIELDS_TRAVERSALS,
    populate: POPULATE_TRAVERSALS,
  });
});
