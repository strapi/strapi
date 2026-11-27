import { engine } from '@strapi/permissions';
import { providerFactory, sanitize, validate } from '@strapi/utils';
import type { z } from 'zod/v4';

import type { Route } from '../core';

/**
 * Base Zod scalar kinds allowed for query params (no nested objects), coerced or not, with their
 * formats (e.g. `z.email()`, `z.int()`). Matches the kinds the runtime check accepts.
 */
type ZodScalarSchema = z.ZodType &
  (z.core.$ZodString | z.core.$ZodNumber | z.core.$ZodBoolean | z.core.$ZodEnum);

/**
 * A scalar, or `TInner` inside one `optional`, `default` or `array` wrapper: one level of the
 * runtime check, which unwraps these three before it checks the scalar kind.
 */
type ZodWrappedSchema<TInner extends z.core.SomeType> =
  ZodScalarSchema | z.ZodOptional<TInner> | z.ZodDefault<TInner> | z.ZodArray<TInner>;

/**
 * Allowed Zod schema types for addQueryParams: scalars (string, number, boolean, enum) inside any
 * nesting of `optional`, `default` and `array`, e.g. `z.coerce.number().optional().default(10)` or
 * `z.array(z.string().optional())`. Nested objects and other wrappers (e.g. `nullable`) are not
 * allowed, as in the runtime check.
 *
 * The runtime check unwraps without a limit. This type follows up to 5 wrappers around the scalar:
 * a type that recurses without a limit is too deep for TypeScript (TS2589). Real query params use
 * fewer, e.g. `z.array(z.coerce.number().default(0)).optional()` uses 3.
 *
 * Query string values reach the schema as strings, so `addQueryParams` also requires a schema that
 * accepts a string (see {@link QueryStringSchema}).
 */
export type ZodQueryParamSchema = ZodWrappedSchema<
  ZodWrappedSchema<ZodWrappedSchema<ZodWrappedSchema<ZodWrappedSchema<ZodScalarSchema>>>>
>;

/** Zod namespace Strapi passes into `schema` factory callbacks. */
export type ZodSchemaFactory = typeof z;

/** Schema + optional matchRoute for one query param. Keys in addQueryParams are the param names. */
export type QueryParamEntry = {
  /** Zod schema or factory. Prefer `(z) => schema` so the app does not import Zod. Must be scalar or array of scalars (no nested objects) that accepts a string, e.g. `z.coerce.number()` rather than `z.number()`. */
  schema: ZodQueryParamSchema | ((z: ZodSchemaFactory) => ZodQueryParamSchema);
  /** If provided, the param is only merged into routes for which this returns true. */
  matchRoute?: (route: Route) => boolean;
};

/** Schema + optional matchRoute for one input param (root-level body.data). Keys in addInputParams are the param names. */
export type InputParamEntry = {
  /** Zod schema or factory. Prefer `(z) => schema` so the app does not import Zod. Any Zod type allowed (scalars, objects, arrays). */
  schema: z.ZodType | ((z: ZodSchemaFactory) => z.ZodType);
  /** If provided, the param is only merged into routes for which this returns true. */
  matchRoute?: (route: Route) => boolean;
};

/** Options for addQueryParams: keys are param names, values are schema + optional matchRoute. */
export type AddQueryParamsOptions = Record<string, QueryParamEntry>;

/** Error a query param schema that cannot parse a query string is checked against. */
type QueryStringSchemaError =
  'Query values are strings: this schema never parses one. Use z.coerce.number() instead of z.number(), and z.enum(["true", "false"]) instead of z.boolean()';

/**
 * Whether a schema input takes what a query string holds: a string (any string for `z.string()`,
 * some strings for `z.enum()`, anything for coerced schemas whose input is `unknown`), or an array
 * of those for a repeated key.
 */
type AcceptsQueryString<TInput> = unknown extends TInput
  ? true
  : [Extract<TInput, string>] extends [never]
    ? [Extract<TInput, readonly unknown[]>] extends [never]
      ? false
      : AcceptsQueryString<Extract<TInput, readonly unknown[]>[number]>
    : true;

/**
 * Resolves to `TSchema` when it accepts what a query string holds (see
 * {@link AcceptsQueryString}). Resolves to {@link QueryStringSchemaError} otherwise, e.g. for
 * `z.number()` or `z.boolean()`, whose input is a number or a boolean and which fail on every value.
 */
export type QueryStringSchema<TSchema> =
  AcceptsQueryString<z.input<TSchema>> extends true ? TSchema : QueryStringSchemaError;

/** Checks each param schema of `TOptions`, given directly or returned by its factory. */
export type QueryStringParams<TOptions extends AddQueryParamsOptions> = {
  [TParam in keyof TOptions]: {
    schema: TOptions[TParam]['schema'] extends (z: ZodSchemaFactory) => infer TSchema
      ? (z: ZodSchemaFactory) => QueryStringSchema<TSchema>
      : QueryStringSchema<TOptions[TParam]['schema']>;
  };
};

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
  engine: ReturnType<typeof engine.new>;
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
   * Prefer `schema: (z) => …`. Strapi passes its own Zod into the callback, so apps do not import `zod`, `zod/v4`, or `@strapi/utils`.
   *
   * Query values are strings (arrays of strings for a repeated key), so the schema must accept a string:
   * `z.number()` and `z.boolean()` fail on every value and are a type error. For a number, use `z.coerce.number()`.
   * For a boolean, use `z.enum(['true', 'false'])` and compare the string; `z.coerce.boolean()` parses `'false'` as `true`.
   *
   * @example
   * strapi.contentAPI.addQueryParams({
   *   search: {
   *     schema: (z) => z.string().max(200).optional(),
   *   },
   *   minRating: {
   *     schema: (z) => z.coerce.number().int().min(1).optional(),
   *   },
   * });
   *
   * @param options - {@link AddQueryParamsOptions}: record of param name → {@link QueryParamEntry}. Each entry has:
   * @param options.[paramName] - {@link QueryParamEntry} (key is the param name, e.g. `"search"`).
   * @param options.[paramName].schema - {@link ZodQueryParamSchema} or `(z: {@link ZodSchemaFactory}) => {@link ZodQueryParamSchema}`. Prefer the factory. Must be scalar or array of scalars, and accept a string ({@link QueryStringSchema}). No nested objects.
   * @param options.[paramName].matchRoute - Optional. `(route: {@link Route}) => boolean`; if provided, this param is only added to routes for which it returns true.
   */
  addQueryParams: <TOptions extends AddQueryParamsOptions>(
    options: TOptions & QueryStringParams<TOptions>
  ) => void;
  /**
   * Register extra input params (root-level body.data) to be merged into content-api route schemas.
   * Any Zod type is allowed (scalars, objects, arrays). Enforced at runtime.
   * Prefer `schema: (z) => …`. Strapi passes its own Zod into the callback, so apps do not import `zod`, `zod/v4`, or `@strapi/utils`.
   *
   * @example
   * strapi.contentAPI.addInputParams({
   *   clientMutationId: {
   *     schema: (z) => z.string().max(100).optional(),
   *   },
   * });
   *
   * @param options - {@link AddInputParamsOptions}: record of param name → {@link InputParamEntry}. Each entry has:
   * @param options.[paramName] - {@link InputParamEntry} (key is the root-level key in body.data, e.g. `"metadata"`).
   * @param options.[paramName].schema - `z.ZodType` or `(z: {@link ZodSchemaFactory}) => z.ZodType`. Prefer the factory. Any Zod type (e.g. z.object(), z.array(), scalars).
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
