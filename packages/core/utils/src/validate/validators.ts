import { curry, isEmpty, isNil } from 'lodash/fp';

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
import { throwInvalidParam } from './utils';
import type { Model, Data } from '../types';

const { ID_ATTRIBUTE, DOC_ID_ATTRIBUTE } = constants;

interface Context {
  schema: Model;
  getModel: (model: string) => Model;
}

const throwPasswords = (ctx: Context) => async (entity: Data) => {
  if (!ctx.schema) {
    throw new Error('Missing schema in throwPasswords');
  }

  return traverseEntity(throwPassword, ctx, entity);
};

const defaultValidateFilters = curry((ctx: Context, filters: unknown) => {
  // TODO: schema checks should check that it is a validate schema with yup
  if (!ctx.schema) {
    throw new Error('Missing schema in defaultValidateFilters');
  }

  return pipeAsync(
    // keys that are not attributes or valid operators
    traverseQueryFilters(({ key, attribute, path }) => {
      // ID is not an attribute per se, so we need to make
      // an extra check to ensure we're not removing it
      if ([ID_ATTRIBUTE, DOC_ID_ATTRIBUTE].includes(key)) {
        return;
      }

      const isAttribute = !!attribute;

      if (!isAttribute && !isOperator(key)) {
        throwInvalidParam({ key, path: path.attribute });
      }
    }, ctx),
    // dynamic zones from filters
    traverseQueryFilters(throwDynamicZones, ctx),
    // morphTo relations from filters; because you can't have deep filtering on morph relations
    traverseQueryFilters(throwMorphToRelations, ctx),
    // passwords from filters
    traverseQueryFilters(throwPassword, ctx),
    // private from filters
    traverseQueryFilters(throwPrivate, ctx)
    // we allow empty objects to validate and only sanitize them out, so that users may write "lazy" queries without checking their params exist
  )(filters);
});

const defaultValidateSort = curry((ctx: Context, sort: unknown) => {
  if (!ctx.schema) {
    throw new Error('Missing schema in defaultValidateSort');
  }

  return pipeAsync(
    // non attribute keys
    traverseQuerySort(({ key, attribute, path }) => {
      // ID is not an attribute per se, so we need to make
      // an extra check to ensure we're not removing it
      if ([ID_ATTRIBUTE, DOC_ID_ATTRIBUTE].includes(key)) {
        return;
      }

      if (!attribute) {
        throwInvalidParam({ key, path: path.attribute });
      }
    }, ctx),
    // dynamic zones from sort
    traverseQuerySort(throwDynamicZones, ctx),
    // morphTo relations from sort
    traverseQuerySort(throwMorphToRelations, ctx),
    // private from sort
    traverseQuerySort(throwPrivate, ctx),
    // passwords from filters
    traverseQuerySort(throwPassword, ctx),
    // keys for empty non-scalar values
    traverseQuerySort(({ key, attribute, value, path }) => {
      // ID is not an attribute per se, so we need to make
      // an extra check to ensure we're not removing it
      if ([ID_ATTRIBUTE, DOC_ID_ATTRIBUTE].includes(key)) {
        return;
      }

      if (!isScalarAttribute(attribute) && isEmpty(value)) {
        throwInvalidParam({ key, path: path.attribute });
      }
    }, ctx)
  )(sort);
});

const defaultValidateFields = curry((ctx: Context, fields: unknown) => {
  if (!ctx.schema) {
    throw new Error('Missing schema in defaultValidateFields');
  }

  return pipeAsync(
    // Only allow scalar attributes
    traverseQueryFields(({ key, attribute, path }) => {
      // ID is not an attribute per se, so we need to make
      // an extra check to ensure we're not removing it
      if ([ID_ATTRIBUTE, DOC_ID_ATTRIBUTE].includes(key)) {
        return;
      }

      if (isNil(attribute) || !isScalarAttribute(attribute)) {
        throwInvalidParam({ key, path: path.attribute });
      }
    }, ctx),
    // private fields
    traverseQueryFields(throwPrivate, ctx),
    // password fields
    traverseQueryFields(throwPassword, ctx)
  )(fields);
});

const defaultValidatePopulate = curry((ctx: Context, populate: unknown) => {
  if (!ctx.schema) {
    throw new Error('Missing schema in defaultValidatePopulate');
  }

  return pipeAsync(
    traverseQueryPopulate(async ({ key, value, schema, attribute, getModel }, { set }) => {
      if (attribute) {
        return;
      }

      if (key === 'sort') {
        set(
          key,
          await defaultValidateSort(
            {
              schema,
              getModel,
            },
            value
          )
        );
      }

      if (key === 'filters') {
        set(
          key,
          await defaultValidateFilters(
            {
              schema,
              getModel,
            },
            value
          )
        );
      }

      if (key === 'fields') {
        set(
          key,
          await defaultValidateFields(
            {
              schema,
              getModel,
            },
            value
          )
        );
      }

      if (key === 'populate') {
        set(
          key,
          await defaultValidatePopulate(
            {
              schema,
              getModel,
            },
            value
          )
        );
      }
    }, ctx),
    // Remove private fields
    traverseQueryPopulate(throwPrivate, ctx)
  )(populate);
});
export {
  throwPasswords,
  defaultValidateFilters,
  defaultValidateSort,
  defaultValidateFields,
  defaultValidatePopulate,
};
