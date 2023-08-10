import { CurriedFunction1 } from 'lodash';
import { isArray, cloneDeep } from 'lodash/fp';

import { getNonWritableAttributes } from '../content-types';
import { pipeAsync } from '../async';

import * as visitors from '../traverse/visitors';
import * as validators from './validators';
import traverseEntity, { Data } from '../traverse-entity';

import * as traversals from './traversals';
import { traverseQueryFilters, traverseQuerySort, traverseQueryPopulate } from './traversals';

import { Model } from '../types';

export interface Options {
  auth?: unknown;
}

interface Validator {
  (schema: Model): CurriedFunction1<Data, Promise<Data>>;
}
export interface ValidateFunc {
  (data: unknown, schema: Model, options?: Options): Promise<unknown>;
}

const createContentAPIValidators = () => {
  const validateInput: ValidateFunc = (data: unknown, schema: Model, { auth } = {}) => {
    if (isArray(data)) {
      return Promise.all(data.map((entry) => validateInput(entry, schema, { auth })));
    }

    const nonWritableAttributes = getNonWritableAttributes(schema);

    const transforms = [
      // Remove non writable attributes
      traverseEntity(visitors.restrictedFields(nonWritableAttributes), { schema }),
    ];

    if (auth) {
      // Remove restricted relations
      transforms.push(traverseEntity(visitors.removeRestrictedRelations(auth), { schema }));
    }

    // Apply sanitizers from registry if exists
    strapi.validators
      .get('content-api.input')
      .forEach((validator: Validator) => transforms.push(validator(schema)));

    return pipeAsync(...transforms)(data as Data);
  };

  const validateQuery = async (
    query: Record<string, unknown>,
    schema: Model,
    { auth }: Options = {}
  ) => {
    const { filters, sort, fields, populate } = query;

    const validatedQuery = cloneDeep(query);

    if (filters) {
      Object.assign(validatedQuery, { filters: await validateFilters(filters, schema, { auth }) });
    }

    if (sort) {
      Object.assign(validatedQuery, { sort: await validateSort(sort, schema, { auth }) });
    }

    if (fields) {
      Object.assign(validatedQuery, { fields: await validateFields(fields, schema) });
    }

    if (populate) {
      Object.assign(validatedQuery, { populate: await validatePopulate(populate, schema) });
    }

    return validatedQuery;
  };

  const validateFilters: ValidateFunc = (filters, schema: Model, { auth } = {}) => {
    if (isArray(filters)) {
      return Promise.all(filters.map((filter) => validateFilters(filter, schema, { auth })));
    }

    const transforms = [validators.defaultSanitizeFilters(schema)];

    if (auth) {
      transforms.push(traverseQueryFilters(visitors.removeRestrictedRelations(auth), { schema }));
    }

    return pipeAsync(...transforms)(filters);
  };

  const validateSort: ValidateFunc = (sort, schema: Model, { auth } = {}) => {
    const transforms = [validators.defaultSanitizeSort(schema)];

    if (auth) {
      transforms.push(traverseQuerySort(visitors.removeRestrictedRelations(auth), { schema }));
    }

    return pipeAsync(...transforms)(sort);
  };

  const validateFields: ValidateFunc = (fields, schema: Model) => {
    const transforms = [validators.defaultSanitizeFields(schema)];

    return pipeAsync(...transforms)(fields);
  };

  const validatePopulate: ValidateFunc = (populate, schema: Model, { auth } = {}) => {
    const transforms = [validators.defaultSanitizePopulate(schema)];

    if (auth) {
      transforms.push(traverseQueryPopulate(visitors.removeRestrictedRelations(auth), { schema }));
    }

    return pipeAsync(...transforms)(populate);
  };

  return {
    input: validateInput,
    query: validateQuery,
    filters: validateFilters,
    sort: validateSort,
    fields: validateFields,
    populate: validatePopulate,
  };
};

const contentAPI = createContentAPIValidators();

export default {
  contentAPI,
  validators,
  visitors,
  traversals,
};
