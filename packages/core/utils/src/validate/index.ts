import { CurriedFunction1 } from 'lodash';
import { isArray, isObject } from 'lodash/fp';

import { getNonWritableAttributes, constants } from '../content-types';
import { pipe as pipeAsync } from '../async';
import { throwInvalidKey } from './utils';

import * as visitors from './visitors';
import * as validators from './validators';
import traverseEntity from '../traverse-entity';

import { traverseQueryFilters, traverseQuerySort, traverseQueryPopulate } from '../traverse';

import { Model, Data } from '../types';
import { ValidationError } from '../errors';

const { ID_ATTRIBUTE, DOC_ID_ATTRIBUTE } = constants;

export interface Options {
  auth?: unknown;
}

export interface Validator {
  (schema: Model): CurriedFunction1<Data, Promise<Data>>;
}
export interface ValidateFunc {
  (data: unknown, schema: Model, options?: Options): Promise<void>;
}

interface APIOptions {
  validators?: Validators;
  getModel: (model: string) => Model;
}

export interface Validators {
  input?: Validator[];
}

const createAPIValidators = (opts: APIOptions) => {
  const { getModel } = opts || {};

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
        if (isObject(data)) {
          if (ID_ATTRIBUTE in data) {
            throwInvalidKey({ key: ID_ATTRIBUTE });
          }

          if (DOC_ID_ATTRIBUTE in data) {
            throwInvalidKey({ key: DOC_ID_ATTRIBUTE });
          }
        }
        return data;
      },
      // non-writable attributes
      traverseEntity(visitors.throwRestrictedFields(nonWritableAttributes), { schema, getModel }),
      // unrecognized attributes
      traverseEntity(visitors.throwUnrecognizedFields, { schema, getModel }),
    ];

    if (auth) {
      // restricted relations
      transforms.push(
        traverseEntity(visitors.throwRestrictedRelations(auth), {
          schema,
          getModel,
        })
      );
    }

    // Apply validators from registry if exists
    opts?.validators?.input?.forEach((validator: Validator) => transforms.push(validator(schema)));

    try {
      await pipeAsync(...transforms)(data as Data);
    } catch (e) {
      if (e instanceof ValidationError) {
        e.details.source = 'body';
      }
      throw e;
    }
  };

  const validateQuery = async (
    query: Record<string, unknown>,
    schema: Model,
    { auth }: Options = {}
  ) => {
    if (!schema) {
      throw new Error('Missing schema in validateQuery');
    }
    const { filters, sort, fields, populate } = query;

    if (filters) {
      await validateFilters(filters, schema, { auth });
    }

    if (sort) {
      await validateSort(sort, schema, { auth });
    }

    if (fields) {
      await validateFields(fields, schema);
    }

    // a wildcard is always valid; its conversion will be handled by the entity service and can be optimized with sanitizer
    if (populate && populate !== '*') {
      await validatePopulate(populate, schema);
    }
  };

  const validateFilters: ValidateFunc = async (filters, schema: Model, { auth } = {}) => {
    if (!schema) {
      throw new Error('Missing schema in validateFilters');
    }
    if (isArray(filters)) {
      await Promise.all(filters.map((filter) => validateFilters(filter, schema, { auth })));
      return;
    }

    const transforms = [validators.defaultValidateFilters({ schema, getModel })];

    if (auth) {
      transforms.push(
        traverseQueryFilters(visitors.throwRestrictedRelations(auth), {
          schema,
          getModel,
        })
      );
    }

    try {
      await pipeAsync(...transforms)(filters);
    } catch (e) {
      if (e instanceof ValidationError) {
        e.details.source = 'query';
        e.details.param = 'filters';
      }
      throw e;
    }
  };

  const validateSort: ValidateFunc = async (sort, schema: Model, { auth } = {}) => {
    if (!schema) {
      throw new Error('Missing schema in validateSort');
    }
    const transforms = [validators.defaultValidateSort({ schema, getModel })];

    if (auth) {
      transforms.push(
        traverseQuerySort(visitors.throwRestrictedRelations(auth), {
          schema,
          getModel,
        })
      );
    }

    try {
      await pipeAsync(...transforms)(sort);
    } catch (e) {
      if (e instanceof ValidationError) {
        e.details.source = 'query';
        e.details.param = 'sort';
      }
      throw e;
    }
  };

  const validateFields: ValidateFunc = async (fields, schema: Model) => {
    if (!schema) {
      throw new Error('Missing schema in validateFields');
    }
    const transforms = [validators.defaultValidateFields({ schema, getModel })];

    try {
      await pipeAsync(...transforms)(fields);
    } catch (e) {
      if (e instanceof ValidationError) {
        e.details.source = 'query';
        e.details.param = 'fields';
      }
      throw e;
    }
  };

  const validatePopulate: ValidateFunc = async (populate, schema: Model, { auth } = {}) => {
    if (!schema) {
      throw new Error('Missing schema in sanitizePopulate');
    }
    const transforms = [validators.defaultValidatePopulate({ schema, getModel })];

    if (auth) {
      transforms.push(
        traverseQueryPopulate(visitors.throwRestrictedRelations(auth), {
          schema,
          getModel,
        })
      );
    }

    try {
      await pipeAsync(...transforms)(populate);
    } catch (e) {
      if (e instanceof ValidationError) {
        e.details.source = 'query';
        e.details.param = 'populate';
      }
      throw e;
    }
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

export { createAPIValidators, validators, visitors };

export type APIValidators = ReturnType<typeof createAPIValidators>;
