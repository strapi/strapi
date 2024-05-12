import { curry, isEmpty, isNil } from 'lodash/fp';

import { pipeAsync } from '../async';
import traverseEntity from '../traverse-entity';
import { isScalarAttribute } from '../content-types';
import { traverseQueryFilters, traverseQuerySort, traverseQueryFields } from '../traverse';
import { throwPassword, throwPrivate, throwDynamicZones, throwMorphToRelations } from './visitors';
import { isOperator } from '../operators';
import { throwInvalidParam } from './utils';
import type { Model, Data } from '../types';

const throwPasswords = (schema: Model) => async (entity: Data) => {
  if (!schema) {
    throw new Error('Missing schema in throwPasswords');
  }

  return traverseEntity(throwPassword, { schema }, entity);
};

const defaultValidateFilters = curry((schema: Model, filters: unknown) => {
  // TODO: schema checks should check that it is a validate schema with yup
  if (!schema) {
    throw new Error('Missing schema in defaultValidateFilters');
  }
  return pipeAsync(
    // keys that are not attributes or valid operators
    traverseQueryFilters(
      ({ key, attribute }) => {
        // ID is not an attribute per se, so we need to make
        // an extra check to ensure we're not removing it
        if (key === 'id') {
          return;
        }

        const isAttribute = !!attribute;

        if (!isAttribute && !isOperator(key)) {
          throwInvalidParam({ key });
        }
      },
      { schema }
    ),
    // dynamic zones from filters
    traverseQueryFilters(throwDynamicZones, { schema }),
    // morphTo relations from filters; because you can't have deep filtering on morph relations
    traverseQueryFilters(throwMorphToRelations, { schema }),
    // passwords from filters
    traverseQueryFilters(throwPassword, { schema }),
    // private from filters
    traverseQueryFilters(throwPrivate, { schema })
    // we allow empty objects to validate and only sanitize them out, so that users may write "lazy" queries without checking their params exist
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
    // morphTo relations from sort
    traverseQuerySort(throwMorphToRelations, { schema }),
    // private from sort
    traverseQuerySort(throwPrivate, { schema }),
    // passwords from filters
    traverseQuerySort(throwPassword, { schema }),
    // keys for empty non-scalar values
    traverseQuerySort(
      ({ key, attribute, value }) => {
        // ID is not an attribute per se, so we need to make
        // an extra check to ensure we're not removing it
        if (key === 'id') {
          return;
        }

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
        // ID is not an attribute per se, so we need to make
        // an extra check to ensure we're not removing it
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
