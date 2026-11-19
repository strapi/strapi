// Strict-off types that print differently from develop but accept and produce the same values.
// Each check compiles on develop too, so the diagnostics stay equal between the checkouts. The
// harness compiles this file in its own program: adding it to the application program would change
// the order types are checked in, and so the order the surface dump prints their members in.
import type { Core, Public, Schema, UID } from '@strapi/strapi';

type MutuallyAssignable<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Equal<A, B> =
  (<V>() => V extends A ? 1 : 2) extends <V>() => V extends B ? 1 : 2 ? true : false;
type Lookup<TKey extends keyof Core.Strapi> = Core.Strapi[TKey] extends (
  name: infer TName
) => unknown
  ? TName
  : never;

// Root lookups print develop's parameters exactly without strict types: completion lists of
// registered names are strict-only. Pinned with exact equality until the surface gate covers them.
export const lookups: [
  Equal<Lookup<'service'>, UID.Service>,
  Equal<Lookup<'controller'>, UID.Controller>,
  Equal<Lookup<'policy'>, string>,
  Equal<Lookup<'middleware'>, string>,
  Equal<Lookup<'plugin'>, string>,
  Equal<Lookup<'api'>, string>,
  Equal<Lookup<'hook'>, string>,
] = [true, true, true, true, true, true, true];

// The admin guided tour types its schemas as `Schema.ContentTypes`, develop's
// `Public.ContentTypeSchemas` without strict types.
export const schemas: MutuallyAssignable<Schema.ContentTypes, Public.ContentTypeSchemas> = true;
