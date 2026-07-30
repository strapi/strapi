import _ from 'lodash';
import {
  sanitize,
  validate,
  sanitizeRoutesMapForSerialization,
  ALLOWED_QUERY_PARAM_KEYS,
  RESERVED_INPUT_PARAM_KEYS,
} from '@strapi/utils';
import * as z from 'zod/v4';

import type { Core, Modules, UID } from '@strapi/types';

import instantiatePermissionsUtilities from './permissions';

const transformRoutePrefixFor = (pluginName: string) => (route: Core.Route) => {
  const prefix = route.config && route.config.prefix;
  const path = prefix !== undefined ? `${prefix}${route.path}` : `/${pluginName}${route.path}`;

  return {
    ...route,
    path,
  };
};

const filterContentAPI = (route: Core.Route) => route.info.type === 'content-api';

/**
 * Runtime check for addQueryParams: we only allow scalar or array-of-scalar schemas (no nested objects).
 * We keep this in addition to the ZodQueryParamSchema type because: (1) TypeScript can be bypassed (JS,
 * any, or schema from another Zod instance); (2) it gives a clear, immediate error at registration
 * time instead of a later failure in validate/sanitize. This list is intentionally tied to Zod v4
 * constructor names; if Zod changes internals, this may need updating.
 * Compatibility: Zod 3 and Zod 4 Classic (zod/v4) both use these constructor names and
 * expose ._def with .innerType / .element for Optional/Default/Array. Zod 4 Core/Mini use
 * ._zod.def instead; we only accept schemas from the same zod/v4 instance used here.
 */
const ALLOWED_QUERY_SCHEMA_NAMES = new Set([
  'ZodString',
  'ZodNumber',
  'ZodBoolean',
  'ZodEnum',
  'ZodOptional',
  'ZodDefault',
  'ZodArray',
]);

function assertQueryParamSchema(schema: unknown, param: string): void {
  const name = (schema as { constructor?: { name?: string } })?.constructor?.name ?? '';
  if (!ALLOWED_QUERY_SCHEMA_NAMES.has(name)) {
    throw new Error(
      `contentAPI.addQueryParams: param "${param}" schema must be a scalar (string, number, boolean, enum) or array of scalars; got ${name}. Use addInputParams for nested objects.`
    );
  }
  if (name === 'ZodOptional' || name === 'ZodDefault') {
    const inner = (schema as { _def?: { innerType?: unknown } })?._def?.innerType;
    if (inner) assertQueryParamSchema(inner, param);
    return;
  }
  if (name === 'ZodArray') {
    const element = (schema as { _def?: { element?: unknown } })?._def?.element;
    if (element) assertQueryParamSchema(element, param);
  }
}

function resolveSchema<T>(schemaOrFactory: T | ((zInstance: typeof z) => T)): T {
  if (typeof schemaOrFactory === 'function') {
    return (schemaOrFactory as (zInstance: typeof z) => T)(z);
  }
  return schemaOrFactory;
}

const mergeOneQueryParamIntoRoute = (
  route: Core.Route,
  param: string,
  schema: z.ZodType,
  matchRoute?: (route: Core.Route) => boolean
): void => {
  if (matchRoute && !matchRoute(route)) return;
  const query = { ...(route.request?.query ?? {}) };
  if (param in query) {
    throw new Error(
      `contentAPI.addQueryParams: param "${param}" already exists on route ${route.method} ${route.path}`
    );
  }
  route.request = { ...route.request, query: { ...query, [param]: schema } };
};

const mergeOneInputParamIntoRoute = (
  route: Core.Route,
  param: string,
  schema: z.ZodType,
  matchRoute?: (route: Core.Route) => boolean
): void => {
  if (matchRoute && !matchRoute(route)) return;
  const jsonKey = 'application/json';
  type RouteBody = NonNullable<NonNullable<Core.Route['request']>['body']>;
  const body: RouteBody = route.request?.body ? { ...route.request.body } : ({} as RouteBody);
  const existing = body[jsonKey];
  const base =
    existing && typeof existing === 'object' && 'shape' in existing
      ? (existing as { shape: Record<string, z.ZodType> }).shape
      : {};
  if (param in base) {
    throw new Error(
      `contentAPI.addInputParams: param "${param}" already exists on route ${route.method} ${route.path}`
    );
  }
  body[jsonKey] = z.object({ ...base, [param]: schema }) as RouteBody[keyof RouteBody];
  route.request = { ...route.request, body };
};

/** Stored options with schema always resolved (never a function). */
type ResolvedQueryParamEntry = {
  param: string;
  schema: z.ZodType;
  matchRoute?: (route: Core.Route) => boolean;
};
type ResolvedInputParamEntry = {
  param: string;
  schema: z.ZodType;
  matchRoute?: (route: Core.Route) => boolean;
};

/**
 * Create a content API container that holds logic, tools and utils. (eg: permissions, ...)
 */
const createContentAPI = (strapi: Core.Strapi) => {
  const extraQueryParams: ResolvedQueryParamEntry[] = [];
  const extraInputParams: ResolvedInputParamEntry[] = [];

  const addQueryParam = (options: Modules.ContentAPI.QueryParamEntry & { param: string }) => {
    const { param, schema: schemaOrFactory, matchRoute } = options;
    const schema = resolveSchema(schemaOrFactory);
    assertQueryParamSchema(schema, param);
    if ((ALLOWED_QUERY_PARAM_KEYS as readonly string[]).includes(param)) {
      throw new Error(
        `contentAPI.addQueryParams: param "${param}" is reserved by Strapi; use a different name`
      );
    }
    if (extraQueryParams.some((o) => o.param === param)) {
      throw new Error(`contentAPI.addQueryParams: param "${param}" has already been added`);
    }
    extraQueryParams.push({ param, schema, matchRoute });
    // Params are merged into routes when initRouting() runs (applyExtraParamsToRoutes).
    // We do not merge here: at register() time routes may not exist yet (lazy creation), and
    // merging here would cause double-merge when initRouting runs and 400 "invalid param" or
    // "param already exists" errors.
  };

  const addInputParam = (options: Modules.ContentAPI.InputParamEntry & { param: string }) => {
    const { param, schema: schemaOrFactory, matchRoute } = options;
    const schema = resolveSchema(schemaOrFactory);
    if ((RESERVED_INPUT_PARAM_KEYS as readonly string[]).includes(param)) {
      throw new Error(
        `contentAPI.addInputParams: param "${param}" is reserved by Strapi; use a different name`
      );
    }
    if (extraInputParams.some((o) => o.param === param)) {
      throw new Error(`contentAPI.addInputParams: param "${param}" has already been added`);
    }
    extraInputParams.push({ param, schema, matchRoute });
    // Params are merged into routes when initRouting() runs (applyExtraParamsToRoutes).
  };

  /**
   * Register extra query params. Keys = param names; values = { schema, matchRoute? }.
   * Schemas must be Zod scalar or array-of-scalars (enforced at runtime via assertQueryParamSchema).
   */
  const addQueryParams = (options: Modules.ContentAPI.AddQueryParamsOptions) => {
    Object.entries(options).forEach(([param, rest]) => addQueryParam({ param, ...rest }));
  };

  /**
   * Register extra input params (root-level body.data). Keys = param names; values = { schema, matchRoute? }.
   * Any Zod type allowed; enforced at registration time.
   */
  const addInputParams = (options: Modules.ContentAPI.AddInputParamsOptions) => {
    Object.entries(options).forEach(([param, rest]) => addInputParam({ param, ...rest }));
  };

  /** Merge all registered extra params into the given routes (mutates in place). Called at route registration. Throws if a param key already exists. */
  const applyExtraParamsToRoutes = (routes: Core.Route[]): void => {
    routes.forEach((route) => {
      for (const { param, schema, matchRoute } of extraQueryParams) {
        mergeOneQueryParamIntoRoute(route, param, schema, matchRoute);
      }
      for (const { param, schema, matchRoute } of extraInputParams) {
        mergeOneInputParamIntoRoute(route, param, schema, matchRoute);
      }
    });
  };

  const getRoutesMap = async () => {
    const routesMap: Record<string, Core.Route[]> = {};

    _.forEach(strapi.apis, (api, apiName) => {
      const routes = _.flatMap(api.routes, (route) => {
        if ('routes' in route) {
          return route.routes;
        }

        return route;
      }).filter(filterContentAPI);

      if (routes.length === 0) {
        return;
      }

      const apiPrefix = strapi.config.get('api.rest.prefix');
      routesMap[`api::${apiName}`] = routes.map((route) => ({
        ...route,
        path: `${apiPrefix}${route.path}`,
      }));
    });

    _.forEach(strapi.plugins, (plugin, pluginName) => {
      const transformPrefix = transformRoutePrefixFor(pluginName);

      if (Array.isArray(plugin.routes)) {
        return plugin.routes.map(transformPrefix).filter(filterContentAPI);
      }

      const routes = _.flatMap(plugin.routes, (route) => route.routes.map(transformPrefix)).filter(
        filterContentAPI
      );

      if (routes.length === 0) {
        return;
      }

      const apiPrefix = strapi.config.get('api.rest.prefix');
      routesMap[`plugin::${pluginName}`] = routes.map((route) => ({
        ...route,
        path: `${apiPrefix}${route.path}`,
      }));
    });

    return sanitizeRoutesMapForSerialization(routesMap);
  };

  const sanitizer = sanitize.createAPISanitizers({
    getModel(uid: string) {
      return strapi.getModel(uid as UID.Schema);
    },
    get sanitizers() {
      return {
        input: strapi.sanitizers.get('content-api.input'),
        output: strapi.sanitizers.get('content-api.output'),
      };
    },
  });

  const validator = validate.createAPIValidators({
    getModel(uid: string) {
      return strapi.getModel(uid as UID.Schema);
    },
    get validators() {
      return {
        input: strapi.validators.get('content-api.input'),
      };
    },
  });

  return {
    permissions: instantiatePermissionsUtilities(strapi),
    getRoutesMap,
    sanitize: sanitizer,
    validate: validator,
    addQueryParams,
    addInputParams,
    applyExtraParamsToRoutes,
  };
};

export default createContentAPI;
