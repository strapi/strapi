import { curry, isEmpty, isNil, isObject } from 'lodash/fp';

import { pipeAsync } from '../async';
import traverseEntity, { Data } from '../traverse-entity';
import { isScalarAttribute } from '../content-types';

import traversals from '../traverse/traversals';

import { throwPassword, throwPrivate, throwDynamicZones, throwMorphToRelations } from './visitors';
import { isOperator } from '../operators';

import type { Model } from '../types';
import { ValidationError } from '../errors';

const { traverseQueryFilters, traverseQuerySort, traverseQueryFields } = traversals;

const throwPasswords = (schema: Model) => async (entity: Data) => {
  return traverseEntity(throwPassword, { schema }, entity);
};

const defaultValidateFilters = curry((schema: Model, filters: unknown) => {
  return pipeAsync(
    // Remove keys that are not attributes or valid operators
    traverseQueryFilters(
      ({ key, attribute }) => {
        const isAttribute = !!attribute;

        if (!isAttribute && !isOperator(key) && key !== 'id') {
          throw new ValidationError(`invalid key ${key}`);
        }
      },
      { schema }
    ),
    // Remove dynamic zones from filters
    traverseQueryFilters(throwDynamicZones, { schema }),
    // Remove morpTo relations from filters
    traverseQueryFilters(throwMorphToRelations, { schema }),
    // Remove passwords from filters
    traverseQueryFilters(throwPassword, { schema }),
    // Remove private from filters
    traverseQueryFilters(throwPrivate, { schema }),
    // Remove empty objects
    traverseQueryFilters(
      ({ key, value }) => {
        if (isObject(value) && isEmpty(value)) {
          throw new ValidationError(`invalid key ${key}`);
        }
      },
      { schema }
    )
  )(filters);
});

const defaultValidateSort = curry((schema: Model, sort: unknown) => {
  return pipeAsync(
    // Remove non attribute keys
    traverseQuerySort(
      ({ key, attribute }) => {
        // ID is not an attribute per se, so we need to make
        // an extra check to ensure we're not removing it
        if (key === 'id') {
          return;
        }

        if (!attribute) {
          throw new ValidationError(`invalid key ${key}`);
        }
      },
      { schema }
    ),
    // Remove dynamic zones from sort
    traverseQuerySort(throwDynamicZones, { schema }),
    // Remove morpTo relations from sort
    traverseQuerySort(throwMorphToRelations, { schema }),
    // Remove private from sort
    traverseQuerySort(throwPrivate, { schema }),
    // Remove passwords from filters
    traverseQuerySort(throwPassword, { schema }),
    // Remove keys for empty non-scalar values
    traverseQuerySort(
      ({ key, attribute, value }) => {
        if (!isScalarAttribute(attribute) && isEmpty(value)) {
          throw new ValidationError(`invalid key ${key}`);
        }
      },
      { schema }
    )
  )(sort);
});

const defaultValidateFields = curry((schema: Model, fields: unknown) => {
  return pipeAsync(
    // Only keep scalar attributes
    traverseQueryFields(
      ({ key, attribute }) => {
        if (key === 'id') {
          return;
        }
        if (isNil(attribute) || !isScalarAttribute(attribute)) {
          throw new ValidationError(`invalid key ${key}`);
        }
      },
      { schema }
    ),
    // Remove private fields
    traverseQueryFields(throwPrivate, { schema }),
    // Remove password fields
    traverseQueryFields(throwPassword, { schema })
  )(fields);
});

export { throwPasswords, defaultValidateFilters, defaultValidateSort, defaultValidateFields };
