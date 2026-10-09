import type Koa from 'koa';

import type * as UID from '../uid';
import type { SuggestedString } from '../utils/string';

import type { Strapi } from './strapi';
import type { IsStrict, RegisteredRecord } from './strictness';

export type MiddlewareFactory<T = any> = (
  config: T,
  ctx: { strapi: Strapi }
) => MiddlewareHandler | void;

export type MiddlewareName = UID.Middleware | string;

export type MiddlewareConfig = {
  name?: MiddlewareName | undefined;
  resolve?: string | undefined;
  config?: unknown | undefined;
};

export type MiddlewareHandler = Koa.Middleware;

export type Middleware = MiddlewareHandler | MiddlewareFactory;

/** Middleware UIDs that have a registered config contract. */
export type RegisteredMiddlewareName =
  | keyof Strapi.Registries.AppMiddlewares
  | keyof Strapi.Registries.PackageMiddlewares;

/** Resolves application overrides before package defaults. */
export type MiddlewareConfigFor<TName extends RegisteredMiddlewareName> =
  TName extends keyof Strapi.Registries.AppMiddlewares
    ? Strapi.Registries.AppMiddlewares[TName]
    : TName extends keyof Strapi.Registries.PackageMiddlewares
      ? Strapi.Registries.PackageMiddlewares[TName]
      : never;

/**
 * Middlewares keyed by UID, e.g. `strapi.middlewares`. With strict types enabled, registered UIDs
 * resolve to a factory that receives their config contract. Other keys, literal or dynamic, resolve to
 * the legacy factory.
 */
export type MiddlewareMap = IsStrict extends false
  ? Record<string, MiddlewareFactory>
  : RegisteredRecord<
      { [TName in RegisteredMiddlewareName]: MiddlewareFactory<MiddlewareConfigFor<TName>> },
      MiddlewareFactory
    >;

/**
 * A name accepted by `strapi.middleware(name)`. Runtime resolves it as an exact name.
 * Registered names are listed for completion.
 */
export type MiddlewareLookupName = SuggestedString<RegisteredMiddlewareName>;

/**
 * Return type of `strapi.middleware<T>(name)`: `T` without strict types, and when the name kept its
 * wide default, which happens when the caller passes an explicit type argument or a dynamic name.
 * A registered name resolves to a factory that receives its config contract, like
 * `strapi.middlewares`. Other literal names resolve to `T`, `unknown` by default.
 */
export type MiddlewareLookup<TName extends string, T> = IsStrict extends false
  ? T
  : MiddlewareLookupName extends TName
    ? T
    : TName extends RegisteredMiddlewareName
      ? MiddlewareFactory<MiddlewareConfigFor<TName>>
      : T;

/**
 * The config a route reference passes, `unknown` when the registered config is `any`. A contract whose
 * import does not resolve in the consumer, e.g. third-party types missing under `skipLibCheck`, is an
 * error type: a conditional type over it is an error type too, which would accept any reference.
 * Tuples keep the error type out of the checked and extends positions.
 */
type ReferenceConfig<TConfig> = [0] extends [1 & TConfig] ? unknown : TConfig;

/**
 * Whether a reference may omit the config. Runtime passes `{}` to the factory when it does, by name
 * alone or as `{ name }`, so a config that accepts `undefined` or `{}` is optional.
 */
type IsOptionalMiddlewareConfig<TConfig> = [undefined] extends [TConfig]
  ? true
  : [Record<never, never>] extends [TConfig]
    ? true
    : false;

/** A reference to a registered middleware: its name alone only when its config is optional. */
type RegisteredMiddlewareReference<
  TName extends RegisteredMiddlewareName,
  TConfig = ReferenceConfig<MiddlewareConfigFor<TName>>,
> =
  IsOptionalMiddlewareConfig<TConfig> extends true
    ? TName | { name: TName; config?: TConfig }
    : { name: TName; config: TConfig };

/** Any middleware name. Registered names are listed for completion. */
type SuggestedMiddlewareName = SuggestedString<RegisteredMiddlewareName>;

/** A middleware resolved from a package name or a path relative to the application `dist` directory. */
type ResolvedMiddlewareReference = { resolve: string; config?: unknown };

/**
 * A middleware reference in a typed route config: an inline handler, a `{ resolve, config }` entry,
 * or a middleware name, alone or as `{ name, config }`. Runtime resolves names exactly, without a
 * route namespace.
 * With strict types disabled, any middleware name is accepted; registered names are listed for
 * completion.
 * With strict types enabled, only registered middlewares are accepted by name and their `config` is
 * checked, as for policy references. Without registered middlewares, no name is
 * accepted.
 *
 * TODO @Nico With strict types enabled, editors list no name inside `{ name: '' }`: the handler member
 * has `Function.name: string`, so the object literal narrows to it. Bare names are listed.
 */
export type MiddlewareReference = IsStrict extends false
  ?
      | SuggestedMiddlewareName
      | MiddlewareHandler
      | { name: SuggestedMiddlewareName; config?: unknown }
      | ResolvedMiddlewareReference
  :
      | MiddlewareHandler
      | ResolvedMiddlewareReference
      | {
          [TName in RegisteredMiddlewareName]: RegisteredMiddlewareReference<TName>;
        }[RegisteredMiddlewareName];
