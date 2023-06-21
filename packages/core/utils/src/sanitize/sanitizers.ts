import { curry, isEmpty, isNil, isArray, isObject } from 'lodash/fp';

import { pipeAsync } from '../async';
import traverseEntity, { Data } from '../traverse-entity';
import { isScalarAttribute } from '../content-types';

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
} from './visitors';
import { isOperator } from '../operators';

import type { Model } from '../types';

const sanitizePasswords = (schema: Model) => async (entity: Data) => {
  return traverseEntity(removePassword, { schema }, entity);
};

const defaultSanitizeOutput = async (schema: Model, entity: Data) => {
  return traverseEntity(
    (...args) => {
      removePassword(...args);
      removePrivate(...args);
    },
    { schema },
    entity
  );
};

const defaultSanitizeFilters = curry((schema: Model, filters: unknown) => {
  return pipeAsync(
    // Remove keys that are not attributes or valid operators
    traverseQueryFilters(
      ({ key, attribute }, { remove }) => {
        const isAttribute = !!attribute;

        if (!isAttribute && !isOperator(key) && key !== 'id') {
          remove(key);
        }
      },
      { schema }
    ),
    // Remove dynamic zones from filters
    traverseQueryFilters(removeDynamicZones, { schema }),
    // Remove morpTo relations from filters
    traverseQueryFilters(removeMorphToRelations, { schema }),
    // Remove passwords from filters
    traverseQueryFilters(removePassword, { schema }),
    // Remove private from filters
    traverseQueryFilters(removePrivate, { schema }),
    // Remove empty objects
    traverseQueryFilters(
      ({ key, value }, { remove }) => {
        if (isObject(value) && isEmpty(value)) {
          remove(key);
        }
      },
      { schema }
    )
  )(filters);
});

const defaultSanitizeSort = curry((schema: Model, sort: unknown) => {
  return pipeAsync(
    // Remove non attribute keys
    traverseQuerySort(
      ({ key, attribute }, { remove }) => {
        // ID is not an attribute per se, so we need to make
        // an extra check to ensure we're not removing it
        if (key === 'id') {
          return;
        }

        if (!attribute) {
          remove(key);
        }
      },
      { schema }
    ),
    // Remove dynamic zones from sort
    traverseQuerySort(removeDynamicZones, { schema }),
    // Remove morpTo relations from sort
    traverseQuerySort(removeMorphToRelations, { schema }),
    // Remove private from sort
    traverseQuerySort(removePrivate, { schema }),
    // Remove passwords from filters
    traverseQuerySort(removePassword, { schema }),
    // Remove keys for empty non-scalar values
    traverseQuerySort(
      ({ key, attribute, value }, { remove }) => {
        if (!isScalarAttribute(attribute) && isEmpty(value)) {
          remove(key);
        }
      },
      { schema }
    )
  )(sort);
});

const defaultSanitizeFields = curry((schema: Model, fields: unknown) => {
  return pipeAsync(
    // Only keep scalar attributes
    traverseQueryFields(
      ({ key, attribute }, { remove }) => {
        if (isNil(attribute) || !isScalarAttribute(attribute)) {
          remove(key);
        }
      },
      { schema }
    ),
    // Remove private fields
    traverseQueryFields(removePrivate, { schema }),
    // Remove password fields
    traverseQueryFields(removePassword, { schema }),
    // Remove nil values from fields array
    (value) => (isArray(value) ? value.filter((field) => !isNil(field)) : value)
  )(fields);
});

const defaultSanitizePopulate = curry((schema: Model, populate: unknown) => {
  return pipeAsync(
    traverseQueryPopulate(
      async ({ key, value, schema, attribute }, { set }) => {
        if (attribute) {
          return;
        }

        if (key === 'sort') {
          set(key, await defaultSanitizeSort(schema, value));
        }

        if (key === 'filters') {
          set(key, await defaultSanitizeFilters(schema, value));
        }

        if (key === 'fields') {
          set(key, await defaultSanitizeFields(schema, value));
        }
      },
      { schema }
    ),
    // Remove private fields
    traverseQueryPopulate(removePrivate, { schema })
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
