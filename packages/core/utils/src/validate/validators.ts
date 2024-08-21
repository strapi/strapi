import { isEmpty, isNil } from 'lodash/fp';

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
import { throwInvalidKey } from './utils';
import type { Model, Data } from '../types';

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

// TODO: move this to a utility
// lodash/fp curry does not detect async methods, so we'll use our own that is typed correctly
function asyncCurry<A extends unknown[], R>(
  fn: (...args: A) => Promise<R>
): (...args: Partial<A>) => any {
  return function curried(...args: unknown[]): unknown {
    if (args.length >= fn.length) {
      return fn(...(args as A));
    }
    return (...moreArgs: unknown[]) => curried(...args, ...moreArgs);
  };
}

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
    const functionsToApply = [
      // keys that are not attributes or valid operators
      include.includes('nonAttributesOperators') &&
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
        }, ctx),
      include.includes('dynamicZones') && traverseQueryFilters(throwDynamicZones, ctx),
      include.includes('morphRelations') && traverseQueryFilters(throwMorphToRelations, ctx),
      include.includes('passwords') && traverseQueryFilters(throwPassword, ctx),
      include.includes('private') && traverseQueryFilters(throwPrivate, ctx),
    ].filter((fn): fn is AnyFunc => typeof fn === 'function'); // Remove `false` values

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
    const functionsToApply: Array<AnyFunc> = [
      // Validate non attribute keys
      include.includes('nonAttributesOperators') &&
        traverseQuerySort(({ key, attribute, path }) => {
          // ID is not an attribute per se, so we need to make
          // an extra check to ensure we're not removing it
          if ([ID_ATTRIBUTE, DOC_ID_ATTRIBUTE].includes(key)) {
            return;
          }

          if (!attribute) {
            throwInvalidKey({ key, path: path.attribute });
          }
        }, ctx),

      // Validate dynamic zones from sort
      include.includes('dynamicZones') && traverseQuerySort(throwDynamicZones, ctx),

      // Validate morphTo relations from sort
      include.includes('morphRelations') && traverseQuerySort(throwMorphToRelations, ctx),

      // Validate passwords from sort
      include.includes('passwords') && traverseQuerySort(throwPassword, ctx),

      // Validate private from sort
      include.includes('private') && traverseQuerySort(throwPrivate, ctx),

      // Validate non-scalar empty keys
      include.includes('nonScalarEmptyKeys') &&
        traverseQuerySort(({ key, attribute, value, path }) => {
          // ID is not an attribute per se, so we need to make
          // an extra check to ensure we're not removing it
          if ([ID_ATTRIBUTE, DOC_ID_ATTRIBUTE].includes(key)) {
            return;
          }

          if (!isScalarAttribute(attribute) && isEmpty(value)) {
            throwInvalidKey({ key, path: path.attribute });
          }
        }, ctx),
    ].filter((fn): fn is AnyFunc => typeof fn === 'function'); // Ensure only functions are passed

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
    const functionsToApply: Array<AnyFunc> = [
      // Only allow scalar attributes
      include.includes('scalarAttributes') &&
        traverseQueryFields(({ key, attribute, path }) => {
          // ID is not an attribute per se, so we need to make
          // an extra check to ensure we're not throwing because of it
          if ([ID_ATTRIBUTE, DOC_ID_ATTRIBUTE].includes(key)) {
            return;
          }

          if (isNil(attribute) || !isScalarAttribute(attribute)) {
            throwInvalidKey({ key, path: path.attribute });
          }
        }, ctx),

      // Private fields
      include.includes('privateFields') && traverseQueryFields(throwPrivate, ctx),

      // Password fields
      include.includes('passwordFields') && traverseQueryFields(throwPassword, ctx),
    ].filter((fn): fn is AnyFunc => typeof fn === 'function'); // Ensure only functions are passed

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

export const validatePopulate = asyncCurry(
  async (
    ctx: Context,
    populate: unknown,
    includes: {
      fields?: (typeof FIELDS_TRAVERSALS)[number][];
      sort?: (typeof SORT_TRAVERSALS)[number][];
      filters?: (typeof FILTER_TRAVERSALS)[number][];
    }
  ) => {
    if (!ctx.schema) {
      throw new Error('Missing schema in defaultValidatePopulate');
    }

    return pipeAsync(
      traverseQueryPopulate(async ({ key, value, schema, attribute, getModel }, { set }) => {
        if (attribute) {
          return;
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
        }
      }, ctx),
      // Remove private fields after populating
      traverseQueryPopulate(throwPrivate, ctx)
    )(populate);
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
  });
});
