import permissions from '@strapi/permissions';
import { providerFactory, sanitize, validate } from '@strapi/utils';
import type { z } from 'zod/v4';

import type { Route } from '../core';

/** Base Zod scalar types allowed for query params (no nested objects). */
type ZodScalarSchema = z.ZodString | z.ZodNumber | z.ZodBoolean | z.ZodEnum<Record<string, string>>;

/**
 * Allowed Zod schema types for addQueryParams: scalars (string, number, boolean, enum) or arrays of scalars.
 * Optional and default wrappers are allowed. Nested objects are not allowed for query params.
 */
export type ZodQueryParamSchema =
  | ZodScalarSchema
  | z.ZodOptional<ZodScalarSchema | z.ZodArray<ZodScalarSchema>>
  | z.ZodDefault<ZodScalarSchema | z.ZodArray<ZodScalarSchema>>
  | z.ZodArray<ZodScalarSchema>;

/** Zod namespace type (e.g. from `import * as z from 'zod/v4'`) passed to schema factory. */
export type ZodSchemaFactory = typeof z;

/** Schema + optional matchRoute for one query param. Keys in addQueryParams are the param names. */
export type QueryParamEntry = {
  /** Zod schema or factory. Must be scalar or array of scalars (no nested objects). */
  schema: ZodQueryParamSchema | ((z: ZodSchemaFactory) => ZodQueryParamSchema);
  /** If provided, the param is only merged into routes for which this returns true. */
  matchRoute?: (route: Route) => boolean;
};

/** Schema + optional matchRoute for one input param (root-level body.data). Keys in addInputParams are the param names. */
export type InputParamEntry = {
  /** Zod schema or factory. Any Zod type allowed (scalars, objects, arrays). */
  schema: z.ZodType | ((z: ZodSchemaFactory) => z.ZodType);
  /** If provided, the param is only merged into routes for which this returns true. */
  matchRoute?: (route: Route) => boolean;
};

/** Options for addQueryParams: keys are param names, values are schema + optional matchRoute. */
export type AddQueryParamsOptions = Record<string, QueryParamEntry>;

/** Options for addInputParams: keys are param names, values are schema + optional matchRoute. */
export type AddInputParamsOptions = Record<string, InputParamEntry>;

export interface Condition {
  name: string;
  [key: string]: unknown;
}

type ConditionProvider = {
  register: (condition: Condition) => Promise<void>;
} & ReturnType<typeof providerFactory>;

type ActionProvider = {
  register: (action: string, payload: Record<string, unknown>) => Promise<void>;
} & ReturnType<typeof providerFactory>;

export interface PermissionUtilities {
  engine: ReturnType<typeof permissions.engine.new>;
  providers: {
    action: ActionProvider;
    condition: ConditionProvider;
  };
  registerActions: () => Promise<void>;
  getActionsMap: () => Record<
    string,
    {
      controllers: Record<string, string[]>;
    }
  >;
}

export interface ContentApi {
  /** Permissions engine and action/condition providers for the content API. */
  permissions: PermissionUtilities;
  /** Returns a map of scope → {@link Route}[] for all content-api routes. */
  getRoutesMap: () => Promise<Record<string, Route[]>>;
  /** Sanitizers for content-api input. */
  sanitize: sanitize.APISanitiers;
  /** Validators for content-api input. */
  validate: validate.APIValidators;
  /**
   * Register extra query params to be merged into content-api route schemas.
   * Query params accept only Zod scalar or array-of-scalar schemas (no nested objects); enforced at runtime. Use {@link ContentApi.addInputParams} for nested structures.
   * Use `z` from `@strapi/utils` or `zod/v4` for compatibility.
   *
   * @param options - {@link AddQueryParamsOptions}: record of param name → {@link QueryParamEntry}. Each entry has:
   * @param options.[paramName] - {@link QueryParamEntry} (key is the param name, e.g. `"search"`).
   * @param options.[paramName].schema - {@link ZodQueryParamSchema} or `(z: {@link ZodSchemaFactory}) => {@link ZodQueryParamSchema}`. Must be scalar or array of scalars. No nested objects.
   * @param options.[paramName].matchRoute - Optional. `(route: {@link Route}) => boolean`; if provided, this param is only added to routes for which it returns true.
   */
  addQueryParams: (options: AddQueryParamsOptions) => void;
  /**
   * Register extra input params (root-level body.data) to be merged into content-api route schemas.
   * Any Zod type is allowed (scalars, objects, arrays). Enforced at runtime.
   *
   * @param options - {@link AddInputParamsOptions}: record of param name → {@link InputParamEntry}. Each entry has:
   * @param options.[paramName] - {@link InputParamEntry} (key is the root-level key in body.data, e.g. `"metadata"`).
   * @param options.[paramName].schema - `z.ZodType` or `(z: {@link ZodSchemaFactory}) => z.ZodType`. Any Zod type (e.g. z.object(), z.array(), scalars).
   * @param options.[paramName].matchRoute - Optional. `(route: {@link Route}) => boolean`; if provided, this param is only added to routes for which it returns true.
   */
  addInputParams: (options: AddInputParamsOptions) => void;
  /**
   * Merge all registered extra params into the given routes (mutates in place). Used at route registration.
   *
   * @internal Used by the framework during route registration. Not intended for app or plugin code.
   * @param routes - Array of {@link Route} objects to mutate with registered query/input params.
   */
  applyExtraParamsToRoutes: (routes: Route[]) => void;
}
