'use strict';

const { curry, isEmpty, isNil, isArray, isObject } = require('lodash/fp');

const { pipeAsync } = require('../async');
const traverseEntity = require('../traverse-entity');
const { isScalarAttribute } = require('../content-types');

const {
  traverseQueryFilters,
  traverseQuerySort,
  traverseQueryPopulate,
  traverseQueryFields,
} = require('../traverse');

const {
  removePassword,
  removePrivate,
  removeDynamicZones,
  removeMorphToRelations,
} = require('./visitors');

const sanitizePasswords = (schema) => async (entity) => {
  return traverseEntity(removePassword, { schema }, entity);
};

const defaultSanitizeOutput = async (schema, entity) => {
  return traverseEntity(
    (...args) => {
      removePassword(...args);
      removePrivate(...args);
    },
    { schema },
    entity
  );
};

const defaultSanitizeFilters = curry((schema, filters) => {
  return pipeAsync(
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

const defaultSanitizeSort = curry((schema, sort) => {
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

const defaultSanitizeFields = curry((schema, fields) => {
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

const defaultSanitizePopulate = curry((schema, populate) => {
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

module.exports = {
  sanitizePasswords,
  defaultSanitizeOutput,
  defaultSanitizeFilters,
  defaultSanitizeSort,
  defaultSanitizeFields,
  defaultSanitizePopulate,
};
