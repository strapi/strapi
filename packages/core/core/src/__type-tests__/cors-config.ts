/**
 * Type-level regression tests for the registered `strapi::cors` config, compiled by
 * `yarn test:ts` (tsc -p tsconfig.json, strict types on) and excluded from the build.
 */
import type { Context } from 'koa';

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

type CorsConfig = NonNullable<Strapi.Registries.PackageMiddlewares['strapi::cors']>;
type OriginFunction = Extract<NonNullable<CorsConfig['origin']>, (...args: never[]) => unknown>;

// With strict types, an `origin` function receives the Koa context that `@koa/cors` passes to it.
export type CorsConfigAssertions = [Expect<Equal<[Parameters<OriginFunction>[0]], [Context]>>];
