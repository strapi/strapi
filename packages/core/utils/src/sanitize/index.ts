import { CurriedFunction1 } from 'lodash';
import { isArray, cloneDeep, omit } from 'lodash/fp';

import { constants, getNonWritableAttributes } from '../content-types';
import { pipe as pipeAsync } from '../async';

import * as visitors from './visitors';
import * as sanitizers from './sanitizers';
import traverseEntity from '../traverse-entity';

import { traverseQueryFilters, traverseQuerySort, traverseQueryPopulate } from '../traverse';
import type { Model, Data } from '../types';

export interface Options {
  auth?: unknown;
}

export interface Sanitizer {
  (schema: Model): CurriedFunction1<Data, Promise<Data>>;
}
export interface SanitizeFunc {
  (data: unknown, schema: Model, options?: Options): Promise<unknown>;
}

export interface APIOptions {
  sanitizers?: Sanitizers;
  getModel: (model: string) => Model;
}

export interface Sanitizers {
  input?: Sanitizer[];
  output?: Sanitizer[];
}

const createAPISanitizers = (opts: APIOptions) => {
  const { getModel } = opts;

  const sanitizeInput: SanitizeFunc = (data: unknown, schema: Model, { auth } = {}) => {
    if (!schema) {
      throw new Error('Missing schema in sanitizeInput');
    }
    if (isArray(data)) {
      return Promise.all(data.map((entry) => sanitizeInput(entry, schema, { auth })));
    }

    const nonWritableAttributes = getNonWritableAttributes(schema);

    const transforms = [
      // Remove first level ID in inputs
      omit(constants.ID_ATTRIBUTE),
      omit(constants.DOC_ID_ATTRIBUTE),
      // Remove non-writable attributes
      traverseEntity(visitors.removeRestrictedFields(nonWritableAttributes), { schema, getModel }),
    ];

    if (auth) {
      // Remove restricted relations
      transforms.push(
        traverseEntity(visitors.removeRestrictedRelations(auth), { schema, getModel })
      );
    }

    // Apply sanitizers from registry if exists
    opts?.sanitizers?.input?.forEach((sanitizer: Sanitizer) => transforms.push(sanitizer(schema)));

    return pipeAsync(...transforms)(data as Data);
  };

  const sanitizeOutput: SanitizeFunc = async (data, schema: Model, { auth } = {}) => {
    if (!schema) {
      throw new Error('Missing schema in sanitizeOutput');
    }
    if (isArray(data)) {
      const res = new Array(data.length);
      for (let i = 0; i < data.length; i += 1) {
        res[i] = await sanitizeOutput(data[i], schema, { auth });
      }
      return res;
    }

    const transforms = [
      (data: Data) => sanitizers.defaultSanitizeOutput({ schema, getModel }, data),
    ];

    if (auth) {
      transforms.push(
        traverseEntity(visitors.removeRestrictedRelations(auth), { schema, getModel })
      );
    }

    // Apply sanitizers from registry if exists
    opts?.sanitizers?.output?.forEach((sanitizer: Sanitizer) => transforms.push(sanitizer(schema)));

    return pipeAsync(...transforms)(data as Data);
  };

  const sanitizeQuery = async (
    query: Record<string, unknown>,
    schema: Model,
    { auth }: Options = {}
  ) => {
    if (!schema) {
      throw new Error('Missing schema in sanitizeQuery');
    }
    const { filters, sort, fields, populate } = query;

    const sanitizedQuery = cloneDeep(query);

    if (filters) {
      Object.assign(sanitizedQuery, { filters: await sanitizeFilters(filters, schema, { auth }) });
    }

    if (sort) {
      Object.assign(sanitizedQuery, { sort: await sanitizeSort(sort, schema, { auth }) });
    }

    if (fields) {
      Object.assign(sanitizedQuery, { fields: await sanitizeFields(fields, schema) });
    }

    if (populate) {
      Object.assign(sanitizedQuery, { populate: await sanitizePopulate(populate, schema) });
    }

    return sanitizedQuery;
  };

  const sanitizeFilters: SanitizeFunc = (filters, schema: Model, { auth } = {}) => {
    if (!schema) {
      throw new Error('Missing schema in sanitizeFilters');
    }
    if (isArray(filters)) {
      return Promise.all(filters.map((filter) => sanitizeFilters(filter, schema, { auth })));
    }

    const transforms = [sanitizers.defaultSanitizeFilters({ schema, getModel })];

    if (auth) {
      transforms.push(
        traverseQueryFilters(visitors.removeRestrictedRelations(auth), { schema, getModel })
      );
    }

    return pipeAsync(...transforms)(filters);
  };

  const sanitizeSort: SanitizeFunc = (sort, schema: Model, { auth } = {}) => {
    if (!schema) {
      throw new Error('Missing schema in sanitizeSort');
    }
    const transforms = [sanitizers.defaultSanitizeSort({ schema, getModel })];

    if (auth) {
      transforms.push(
        traverseQuerySort(visitors.removeRestrictedRelations(auth), { schema, getModel })
      );
    }

    return pipeAsync(...transforms)(sort);
  };

  const sanitizeFields: SanitizeFunc = (fields, schema: Model) => {
    if (!schema) {
      throw new Error('Missing schema in sanitizeFields');
    }
    const transforms = [sanitizers.defaultSanitizeFields({ schema, getModel })];

    return pipeAsync(...transforms)(fields);
  };

  const sanitizePopulate: SanitizeFunc = (populate, schema: Model, { auth } = {}) => {
    if (!schema) {
      throw new Error('Missing schema in sanitizePopulate');
    }
    const transforms = [sanitizers.defaultSanitizePopulate({ schema, getModel })];

    if (auth) {
      transforms.push(
        traverseQueryPopulate(visitors.removeRestrictedRelations(auth), { schema, getModel })
      );
    }

    return pipeAsync(...transforms)(populate);
  };

  return {
    input: sanitizeInput,
    output: sanitizeOutput,
    query: sanitizeQuery,
    filters: sanitizeFilters,
    sort: sanitizeSort,
    fields: sanitizeFields,
    populate: sanitizePopulate,
  };
};

export { createAPISanitizers, sanitizers, visitors };

export type APISanitiers = ReturnType<typeof createAPISanitizers>;
