import { curry, isEmpty, isNil, isObject } from 'lodash/fp';

import { pipeAsync } from '../async';
import traverseEntity, { Data } from '../traverse-entity';
import { isScalarAttribute } from '../content-types';

import traversals from '../traverse/traversals';

import { throwPassword, throwPrivate, throwDynamicZones, throwMorphToRelations } from './visitors';
import { isOperator } from '../operators';

import type { Model } from '../types';
import { throwInvalidParam } from './utils';

const { traverseQueryFilters, traverseQuerySort, traverseQueryFields } = traversals;

const throwPasswords = (schema: Model) => async (entity: Data) => {
  if (!schema) {
    throw new Error('Missing schema in throwPasswords');
  }
  return traverseEntity(throwPassword, { schema }, entity);
};

const defaultValidateFilters = curry((schema: Model, filters: unknown) => {
  if (!schema) {
    throw new Error('Missing schema in defaultValidateFilters');
  }
  return pipeAsync(
    // keys that are not attributes or valid operators
    traverseQueryFilters(
      ({ key, attribute }) => {
        const isAttribute = !!attribute;

        if (!isAttribute && !isOperator(key) && key !== 'id') {
          throwInvalidParam({ key });
        }
      },
      { schema }
    ),
    // dynamic zones from filters
    traverseQueryFilters(throwDynamicZones, { schema }),
    //  morpTo relations from filters
    traverseQueryFilters(throwMorphToRelations, { schema }),
    // passwords from filters
    traverseQueryFilters(throwPassword, { schema }),
    // private from filters
    traverseQueryFilters(throwPrivate, { schema }),
    // empty objects
    traverseQueryFilters(
      ({ key, value }) => {
        if (isObject(value) && isEmpty(value)) {
          throwInvalidParam({ key });
        }
      },
      { schema }
    )
  )(filters);
});

const defaultValidateSort = curry((schema: Model, sort: unknown) => {
  if (!schema) {
    throw new Error('Missing schema in defaultValidateSort');
  }
  return pipeAsync(
    // non attribute keys
    traverseQuerySort(
      ({ key, attribute }) => {
        // ID is not an attribute per se, so we need to make
        // an extra check to ensure we're not removing it
        if (key === 'id') {
          return;
        }

        if (!attribute) {
          throwInvalidParam({ key });
        }
      },
      { schema }
    ),
    // dynamic zones from sort
    traverseQuerySort(throwDynamicZones, { schema }),
    // morpTo relations from sort
    traverseQuerySort(throwMorphToRelations, { schema }),
    // private from sort
    traverseQuerySort(throwPrivate, { schema }),
    // passwords from filters
    traverseQuerySort(throwPassword, { schema }),
    // keys for empty non-scalar values
    traverseQuerySort(
      ({ key, attribute, value }) => {
        if (!isScalarAttribute(attribute) && isEmpty(value)) {
          throwInvalidParam({ key });
        }
      },
      { schema }
    )
  )(sort);
});

const defaultValidateFields = curry((schema: Model, fields: unknown) => {
  if (!schema) {
    throw new Error('Missing schema in defaultValidateFields');
  }
  return pipeAsync(
    // Only allow scalar attributes
    traverseQueryFields(
      ({ key, attribute }) => {
        if (key === 'id') {
          return;
        }
        if (isNil(attribute) || !isScalarAttribute(attribute)) {
          throwInvalidParam({ key });
        }
      },
      { schema }
    ),
    // private fields
    traverseQueryFields(throwPrivate, { schema }),
    // password fields
    traverseQueryFields(throwPassword, { schema })
  )(fields);
});

export { throwPasswords, defaultValidateFilters, defaultValidateSort, defaultValidateFields };
