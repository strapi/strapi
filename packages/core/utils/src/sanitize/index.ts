import { CurriedFunction1 } from 'lodash';
import { isArray, cloneDeep } from 'lodash/fp';

import { getNonWritableAttributes } from '../content-types';
import { pipeAsync } from '../async';

import * as visitors from './visitors';
import * as sanitizers from './sanitizers';
import traverseEntity, { Data } from '../traverse-entity';

import { traverseQueryFilters, traverseQuerySort, traverseQueryPopulate } from '../traverse';
import { Model } from '../types';

export interface Options {
  auth?: unknown;
}

interface Sanitizer {
  (schema: Model): CurriedFunction1<Data, Promise<Data>>;
}
export interface SanitizeFunc {
  (data: unknown, schema: Model, options?: Options): Promise<unknown>;
}

const createContentAPISanitizers = () => {
  const sanitizeInput: SanitizeFunc = (data: unknown, schema: Model, { auth } = {}) => {
    if (!schema) {
      throw new Error('Missing schema in sanitizeInput');
    }
    if (isArray(data)) {
      return Promise.all(data.map((entry) => sanitizeInput(entry, schema, { auth })));
    }

    const nonWritableAttributes = getNonWritableAttributes(schema);

    const transforms = [
      // Remove non writable attributes
      traverseEntity(visitors.removeRestrictedFields(nonWritableAttributes), { schema }),
    ];

    if (auth) {
      // Remove restricted relations
      transforms.push(traverseEntity(visitors.removeRestrictedRelations(auth), { schema }));
    }

    // Apply sanitizers from registry if exists
    strapi.sanitizers
      .get('content-api.input')
      .forEach((sanitizer: Sanitizer) => transforms.push(sanitizer(schema)));

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

    const transforms = [(data: Data) => sanitizers.defaultSanitizeOutput(schema, data)];

    if (auth) {
      transforms.push(traverseEntity(visitors.removeRestrictedRelations(auth), { schema }));
    }

    // Apply sanitizers from registry if exists
    strapi.sanitizers
      .get('content-api.output')
      .forEach((sanitizer: Sanitizer) => transforms.push(sanitizer(schema)));

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

    const transforms = [sanitizers.defaultSanitizeFilters(schema)];

    if (auth) {
      transforms.push(traverseQueryFilters(visitors.removeRestrictedRelations(auth), { schema }));
    }

    return pipeAsync(...transforms)(filters);
  };

  const sanitizeSort: SanitizeFunc = (sort, schema: Model, { auth } = {}) => {
    if (!schema) {
      throw new Error('Missing schema in sanitizeSort');
    }
    const transforms = [sanitizers.defaultSanitizeSort(schema)];

    if (auth) {
      transforms.push(traverseQuerySort(visitors.removeRestrictedRelations(auth), { schema }));
    }

    return pipeAsync(...transforms)(sort);
  };

  const sanitizeFields: SanitizeFunc = (fields, schema: Model) => {
    if (!schema) {
      throw new Error('Missing schema in sanitizeFields');
    }
    const transforms = [sanitizers.defaultSanitizeFields(schema)];

    return pipeAsync(...transforms)(fields);
  };

  const sanitizePopulate: SanitizeFunc = (populate, schema: Model, { auth } = {}) => {
    if (!schema) {
      throw new Error('Missing schema in sanitizePopulate');
    }
    const transforms = [sanitizers.defaultSanitizePopulate(schema)];

    if (auth) {
      transforms.push(traverseQueryPopulate(visitors.removeRestrictedRelations(auth), { schema }));
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

const contentAPI = createContentAPISanitizers();

export default {
  contentAPI,
  sanitizers,
  visitors,
};
