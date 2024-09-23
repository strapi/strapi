import { curry, isEmpty, isNil, isArray, isObject } from 'lodash/fp';

import { pipe as pipeAsync } from '../async';
import traverseEntity from '../traverse-entity';
import { isScalarAttribute, constants } from '../content-types';

import {
  traverseQueryFilters,
  traverseQuerySort,
  traverseQueryPopulate,
  traverseQueryFields,
} from '../traverse';

import {
  removePassword,
  removePrivate,
  removeDynamicZones,
  removeMorphToRelations,
  expandWildcardPopulate,
} from './visitors';
import { isOperator } from '../operators';

import type { Model, Data } from '../types';

interface Context {
  schema: Model;
  getModel: (model: string) => Model;
}

const { ID_ATTRIBUTE, DOC_ID_ATTRIBUTE } = constants;

const sanitizePasswords = (ctx: Context) => async (entity: Data) => {
  if (!ctx.schema) {
    throw new Error('Missing schema in sanitizePasswords');
  }

  return traverseEntity(removePassword, ctx, entity);
};

const defaultSanitizeOutput = async (ctx: Context, entity: Data) => {
  if (!ctx.schema) {
    throw new Error('Missing schema in defaultSanitizeOutput');
  }

  return traverseEntity(
    (...args) => {
      removePassword(...args);
      removePrivate(...args);
    },
    ctx,
    entity
  );
};

const defaultSanitizeFilters = curry((ctx: Context, filters: unknown) => {
  if (!ctx.schema) {
    throw new Error('Missing schema in defaultSanitizeFilters');
  }

  return pipeAsync(
    // Remove keys that are not attributes or valid operators
    traverseQueryFilters(({ key, attribute }, { remove }) => {
      const isAttribute = !!attribute;

      // ID is not an attribute per se, so we need to make
      // an extra check to ensure we're not checking it
      if ([ID_ATTRIBUTE, DOC_ID_ATTRIBUTE].includes(key)) {
        return;
      }

      if (!isAttribute && !isOperator(key)) {
        remove(key);
      }
    }, ctx),
    // Remove dynamic zones from filters
    traverseQueryFilters(removeDynamicZones, ctx),
    // Remove morpTo relations from filters
    traverseQueryFilters(removeMorphToRelations, ctx),
    // Remove passwords from filters
    traverseQueryFilters(removePassword, ctx),
    // Remove private from filters
    traverseQueryFilters(removePrivate, ctx),
    // Remove empty objects
    traverseQueryFilters(({ key, value }, { remove }) => {
      if (isObject(value) && isEmpty(value)) {
        remove(key);
      }
    }, ctx)
  )(filters);
});

const defaultSanitizeSort = curry((ctx: Context, sort: unknown) => {
  if (!ctx.schema) {
    throw new Error('Missing schema in defaultSanitizeSort');
  }

  return pipeAsync(
    // Remove non attribute keys
    traverseQuerySort(({ key, attribute }, { remove }) => {
      // ID is not an attribute per se, so we need to make
      // an extra check to ensure we're not checking it
      if ([ID_ATTRIBUTE, DOC_ID_ATTRIBUTE].includes(key)) {
        return;
      }

      if (!attribute) {
        remove(key);
      }
    }, ctx),
    // Remove dynamic zones from sort
    traverseQuerySort(removeDynamicZones, ctx),
    // Remove morpTo relations from sort
    traverseQuerySort(removeMorphToRelations, ctx),
    // Remove private from sort
    traverseQuerySort(removePrivate, ctx),
    // Remove passwords from filters
    traverseQuerySort(removePassword, ctx),
    // Remove keys for empty non-scalar values
    traverseQuerySort(({ key, attribute, value }, { remove }) => {
      // ID is not an attribute per se, so we need to make
      // an extra check to ensure we're not removing it
      if ([ID_ATTRIBUTE, DOC_ID_ATTRIBUTE].includes(key)) {
        return;
      }

      if (!isScalarAttribute(attribute) && isEmpty(value)) {
        remove(key);
      }
    }, ctx)
  )(sort);
});

const defaultSanitizeFields = curry((ctx: Context, fields: unknown) => {
  if (!ctx.schema) {
    throw new Error('Missing schema in defaultSanitizeFields');
  }

  return pipeAsync(
    // Only keep scalar attributes
    traverseQueryFields(({ key, attribute }, { remove }) => {
      // ID is not an attribute per se, so we need to make
      // an extra check to ensure we're not checking it
      if ([ID_ATTRIBUTE, DOC_ID_ATTRIBUTE].includes(key)) {
        return;
      }

      if (isNil(attribute) || !isScalarAttribute(attribute)) {
        remove(key);
      }
    }, ctx),
    // Remove private fields
    traverseQueryFields(removePrivate, ctx),
    // Remove password fields
    traverseQueryFields(removePassword, ctx),
    // Remove nil values from fields array
    (value) => (isArray(value) ? value.filter((field) => !isNil(field)) : value)
  )(fields);
});

const defaultSanitizePopulate = curry((ctx: Context, populate: unknown) => {
  if (!ctx.schema) {
    throw new Error('Missing schema in defaultSanitizePopulate');
  }

  return pipeAsync(
    traverseQueryPopulate(expandWildcardPopulate, ctx),
    traverseQueryPopulate(async ({ key, value, schema, attribute, getModel }, { set }) => {
      if (attribute) {
        return;
      }

      if (key === 'sort') {
        set(key, await defaultSanitizeSort({ schema, getModel }, value));
      }

      if (key === 'filters') {
        set(key, await defaultSanitizeFilters({ schema, getModel }, value));
      }

      if (key === 'fields') {
        set(key, await defaultSanitizeFields({ schema, getModel }, value));
      }

      if (key === 'populate') {
        set(key, await defaultSanitizePopulate({ schema, getModel }, value));
      }
    }, ctx),
    // Remove private fields
    traverseQueryPopulate(removePrivate, ctx)
  )(populate);
});

export {
  sanitizePasswords,
  defaultSanitizeOutput,
  defaultSanitizeFilters,
  defaultSanitizeSort,
  defaultSanitizeFields,
  defaultSanitizePopulate,
};
