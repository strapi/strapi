import { CurriedFunction1 } from 'lodash';
import { isArray, isObject } from 'lodash/fp';

import { getNonWritableAttributes } from '../content-types';
import { pipeAsync } from '../async';
import { throwInvalidParam } from './utils';

import * as visitors from './visitors';
import * as validators from './validators';
import traverseEntity from '../traverse-entity';

import { traverseQueryFilters, traverseQuerySort } from '../traverse';

import { Model, Data } from '../types';

export interface Options {
  auth?: unknown;
}

interface Validator {
  (schema: Model): CurriedFunction1<Data, Promise<Data>>;
}
export interface ValidateFunc {
  (data: unknown, schema: Model, options?: Options): Promise<void>;
}

const createContentAPIValidators = () => {
  const validateInput: ValidateFunc = async (data: unknown, schema: Model, { auth } = {}) => {
    if (!schema) {
      throw new Error('Missing schema in validateInput');
    }

    if (isArray(data)) {
      await Promise.all(data.map((entry) => validateInput(entry, schema, { auth })));
      return;
    }

    const nonWritableAttributes = getNonWritableAttributes(schema);

    const transforms = [
      (data: unknown) => {
        if (isObject(data) && 'id' in data) {
          throwInvalidParam({ key: 'id' });
        }
      },
      // non-writable attributes
      traverseEntity(visitors.throwRestrictedFields(nonWritableAttributes), { schema }),
    ];

    if (auth) {
      // restricted relations
      transforms.push(traverseEntity(visitors.throwRestrictedRelations(auth), { schema }));
    }

    // Apply validators from registry if exists
    strapi.validators
      .get('content-api.input')
      .forEach((validator: Validator) => transforms.push(validator(schema)));

    pipeAsync(...transforms)(data as Data);
  };

  const validateQuery = async (
    query: Record<string, unknown>,
    schema: Model,
    { auth }: Options = {}
  ) => {
    if (!schema) {
      throw new Error('Missing schema in validateQuery');
    }
    const { filters, sort, fields } = query;

    if (filters) {
      await validateFilters(filters, schema, { auth });
    }

    if (sort) {
      await validateSort(sort, schema, { auth });
    }

    if (fields) {
      await validateFields(fields, schema);
    }

    // TODO: validate populate
  };

  const validateFilters: ValidateFunc = async (filters, schema: Model, { auth } = {}) => {
    if (!schema) {
      throw new Error('Missing schema in validateFilters');
    }
    if (isArray(filters)) {
      await Promise.all(filters.map((filter) => validateFilters(filter, schema, { auth })));
      return;
    }

    const transforms = [validators.defaultValidateFilters(schema)];

    if (auth) {
      transforms.push(traverseQueryFilters(visitors.throwRestrictedRelations(auth), { schema }));
    }

    return pipeAsync(...transforms)(filters);
  };

  const validateSort: ValidateFunc = async (sort, schema: Model, { auth } = {}) => {
    if (!schema) {
      throw new Error('Missing schema in validateSort');
    }
    const transforms = [validators.defaultValidateSort(schema)];

    if (auth) {
      transforms.push(traverseQuerySort(visitors.throwRestrictedRelations(auth), { schema }));
    }

    return pipeAsync(...transforms)(sort);
  };

  const validateFields: ValidateFunc = (fields, schema: Model) => {
    if (!schema) {
      throw new Error('Missing schema in validateFields');
    }
    const transforms = [validators.defaultValidateFields(schema)];

    return pipeAsync(...transforms)(fields);
  };

  return {
    input: validateInput,
    query: validateQuery,
    filters: validateFilters,
    sort: validateSort,
    fields: validateFields,
  };
};

const contentAPI = createContentAPIValidators();

export default {
  contentAPI,
  validators,
  visitors,
};
