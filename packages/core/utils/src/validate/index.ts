import { CurriedFunction1 } from 'lodash';
import { isArray, isObject } from 'lodash/fp';
import type { z } from 'zod/v4';

import { getNonWritableAttributes, constants } from '../content-types';
import { ALLOWED_QUERY_PARAM_KEYS } from '../content-api-constants';
import {
  type RouteLike,
  getExtraQueryKeysFromRoute,
  getExtraRootKeysFromRouteBody,
} from '../content-api-route-params';
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
  /**
   * If true, validateQuery throws when the query has any top-level key not in the allowed list.
   * Defaults to false for backward compatibility.
   */
  strictParams?: boolean;
  /**
   * When set, extra query/input params are derived from the route's request schema (and validated with Zod).
   * When absent, no extra params are allowed in strict mode.
   */
  route?: RouteLike;
}

export interface Validator {
  (schema: Model): CurriedFunction1<Data, Promise<Data>>;
}
export interface ValidateFunc {
  (data: unknown, schema: Model, options?: Options): Promise<void>;
}

export type ValidateQueryParamHandler = (
  value: unknown,
  schema: Model,
  options?: Options
) => Promise<void>;

export type ValidateBodyParamHandler = (
  value: unknown,
  schema: Model,
  options?: Options
) => Promise<void>;

interface APIOptions {
  validators?: Validators;
  getModel: (model: string) => Model;
}

export interface Validators {
  input?: Validator[];
}

const createAPIValidators = (opts: APIOptions) => {
  const { getModel } = opts || {};

  const validateInput: ValidateFunc = async (data: unknown, schema: Model, options = {}) => {
    const { auth, route } = options;
    if (!schema) {
      throw new Error('Missing schema in validateInput');
    }

    if (isArray(data)) {
      await Promise.all(data.map((entry) => validateInput(entry, schema, options)));
      return;
    }

    const allowedExtraRootKeys = getExtraRootKeysFromRouteBody(route);

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
      // unrecognized attributes (allowedExtraRootKeys = registered input param keys)
      traverseEntity(visitors.throwUnrecognizedFields, {
        schema,
        getModel,
        allowedExtraRootKeys,
      }),
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

      // Validate extra root keys from route's body schema with Zod (throw on failure).
      //
      // Content-api sends the document payload as body.data; the controller calls validateInput(body.data, ctx),
      // so the input we receive here is the inner payload (keys like "relatedMedia", "name"), not the full body.
      // The route's body schema is z.object({ data: ... }), so its shape includes "data". We skip "data" because
      // the main document payload is already validated above by traverseEntity (throwUnrecognizedFields, etc.);
      // relation ops (connect/disconnect/set) are handled there, not by the route's Zod schema. We only run
      // Zod here for truly extra root keys added via addInputParams (e.g. clientMutationId).
      if (isObject(data) && route?.request?.body?.['application/json']) {
        const bodySchema = route.request.body['application/json'];
        if (typeof bodySchema === 'object' && 'shape' in bodySchema) {
          const shape = (bodySchema as { shape: Record<string, z.ZodTypeAny> }).shape;
          const dataObj = data as Record<string, unknown>;
          for (const key of Object.keys(shape)) {
            if (key === 'data' || !(key in dataObj)) continue;
            const zodSchema = shape[key];
            if (zodSchema && typeof (zodSchema as z.ZodTypeAny).parse === 'function') {
              const result = (zodSchema as z.ZodTypeAny).safeParse(dataObj[key]);
              if (!result.success) {
                throw new ValidationError(
                  (result.error?.message as string) ?? 'Validation failed',
                  { key, path: null, source: 'body', param: key }
                );
              }
            }
          }
        }
      }
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
    { auth, strictParams = false, route }: Options = {}
  ) => {
    if (!schema) {
      throw new Error('Missing schema in validateQuery');
    }

    if (strictParams) {
      const extraQueryKeys = getExtraQueryKeysFromRoute(route);
      const allowedKeys = [...ALLOWED_QUERY_PARAM_KEYS, ...extraQueryKeys];
      for (const key of Object.keys(query)) {
        if (!allowedKeys.includes(key)) {
          try {
            throwInvalidKey({ key, path: null });
          } catch (e) {
            if (e instanceof ValidationError) {
              e.details.source = 'query';
              e.details.param = key;
            }
            throw e;
          }
        }
      }
      // Validate extra query keys from route's request schema with Zod (throw on failure)
      const routeQuerySchema = route?.request?.query;
      if (routeQuerySchema) {
        for (const key of extraQueryKeys) {
          if (key in query) {
            const zodSchema = routeQuerySchema[key];
            if (zodSchema && typeof (zodSchema as z.ZodTypeAny).parse === 'function') {
              const result = (zodSchema as z.ZodTypeAny).safeParse(query[key]);
              if (!result.success) {
                throw new ValidationError(
                  (result.error?.message as string) ?? 'Invalid query param',
                  { key, path: null, source: 'query', param: key }
                );
              }
            }
          }
        }
      }
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
