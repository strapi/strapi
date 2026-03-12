import { CurriedFunction1 } from 'lodash';
import { isArray, cloneDeep, omit, pick } from 'lodash/fp';
import type { z } from 'zod/v4';

import { constants, getNonWritableAttributes } from '../content-types';
import { ALLOWED_QUERY_PARAM_KEYS } from '../content-api-constants';
import {
  type RouteLike,
  getExtraQueryKeysFromRoute,
  getExtraRootKeysFromRouteBody,
} from '../content-api-route-params';
import { pipe as pipeAsync } from '../async';

import * as visitors from './visitors';
import * as sanitizers from './sanitizers';
import traverseEntity from '../traverse-entity';

import { traverseQueryFilters, traverseQuerySort, traverseQueryPopulate } from '../traverse';
import type { Model, Data } from '../types';

export interface Options {
  auth?: unknown;
  /**
   * If true, removes fields that are not declared in the schema (input) or keeps only allowed query param keys (query).
   * Defaults to false for backward compatibility.
   * TODO: In Strapi 6, strictParams will default to true (and may be removed as an option)
   */
  strictParams?: boolean;
  /**
   * When set, extra query/input params are derived from the route's request schema (and validated/sanitized with Zod).
   * When absent, no extra params are allowed in strict mode.
   */
  route?: RouteLike;
}

export interface Sanitizer {
  (schema: Model): CurriedFunction1<Data, Promise<Data>>;
}
export interface SanitizeFunc {
  (data: unknown, schema: Model, options?: Options): Promise<unknown>;
}

export type SanitizeQueryParamHandler = (
  value: unknown,
  schema: Model,
  options?: Options
) => Promise<unknown>;

export type SanitizeBodyParamHandler = (
  value: unknown,
  schema: Model,
  options?: Options
) => Promise<unknown>;

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

  const sanitizeInput: SanitizeFunc = (
    data: unknown,
    schema: Model,
    { auth, strictParams = false, route } = {}
  ) => {
    if (!schema) {
      throw new Error('Missing schema in sanitizeInput');
    }
    if (isArray(data)) {
      return Promise.all(
        data.map((entry) => sanitizeInput(entry, schema, { auth, strictParams, route }))
      );
    }

    const allowedExtraRootKeys = getExtraRootKeysFromRouteBody(route);

    const nonWritableAttributes = getNonWritableAttributes(schema);

    const transforms = [
      // Remove first level ID in inputs
      omit(constants.ID_ATTRIBUTE),
      omit(constants.DOC_ID_ATTRIBUTE),
      // Remove non-writable attributes
      traverseEntity(visitors.removeRestrictedFields(nonWritableAttributes), { schema, getModel }),
    ];

    if (strictParams) {
      // Remove unrecognized fields (allowedExtraRootKeys = registered input param keys)
      transforms.push(
        traverseEntity(visitors.removeUnrecognizedFields, {
          schema,
          getModel,
          allowedExtraRootKeys,
        })
      );
    }

    if (auth) {
      // Remove restricted relations
      transforms.push(
        traverseEntity(visitors.removeRestrictedRelations(auth), { schema, getModel })
      );
    }

    // Apply sanitizers from registry if exists
    opts?.sanitizers?.input?.forEach((sanitizer: Sanitizer) => transforms.push(sanitizer(schema)));

    /**
     * For each extra root key from the route's body schema present in data, run Zod safeParse.
     * If parsing fails, the key is removed from the output.
     *
     * Content-api sends the document payload as body.data; the controller calls sanitizeInput(body.data, ctx),
     * so the input we receive here is the inner payload (keys like "relatedMedia", "name"), not the full body.
     * The route's body schema is z.object({ data: ... }), so its shape includes "data". We skip "data" because
     * the main document payload is already sanitized above by traverseEntity (removeUnrecognizedFields, etc.);
     * relation ops (connect/disconnect/set) are handled there, not by the route's Zod schema. We only run
     * Zod here for truly extra root keys added via addInputParams (e.g. clientMutationId).
     */
    const routeBodySanitizeTransform = async (data: Data): Promise<Data> => {
      if (!data || typeof data !== 'object' || Array.isArray(data)) return data;
      const obj = data as Record<string, unknown>;
      const bodySchema = route?.request?.body?.['application/json'];
      if (bodySchema && typeof bodySchema === 'object' && 'shape' in bodySchema) {
        const shape = (bodySchema as { shape: Record<string, z.ZodTypeAny> }).shape;
        for (const key of Object.keys(shape)) {
          if (key === 'data' || !(key in obj)) continue;
          const zodSchema = shape[key];
          if (zodSchema && typeof (zodSchema as z.ZodTypeAny).safeParse === 'function') {
            const result = (zodSchema as z.ZodTypeAny).safeParse(obj[key]);
            if (result.success) {
              obj[key] = result.data;
            } else {
              delete obj[key];
            }
          }
        }
      }
      return data;
    };
    (transforms as Array<(data: Data) => Data | Promise<Data>>).push(routeBodySanitizeTransform);

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
    { auth, strictParams = false, route }: Options = {}
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

    const extraQueryKeys = getExtraQueryKeysFromRoute(route);
    const routeQuerySchema = route?.request?.query;
    if (routeQuerySchema) {
      for (const key of extraQueryKeys) {
        if (key in query) {
          const zodSchema = routeQuerySchema[key];
          if (zodSchema && typeof (zodSchema as z.ZodTypeAny).safeParse === 'function') {
            const result = (zodSchema as z.ZodTypeAny).safeParse(query[key]);
            if (result.success) {
              sanitizedQuery[key] = result.data;
            } else {
              delete sanitizedQuery[key];
            }
          }
        }
      }
    }

    if (strictParams) {
      const allowedKeys = [...ALLOWED_QUERY_PARAM_KEYS, ...extraQueryKeys];
      return pick(allowedKeys, sanitizedQuery) as Record<string, unknown>;
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
