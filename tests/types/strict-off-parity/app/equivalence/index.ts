// Strict-off types that print differently from develop but accept and produce the same values.
// Each check compiles on develop too, so the diagnostics stay equal between the checkouts. The
// harness compiles this file in its own program: adding it to the application program would change
// the order types are checked in, and so the order the surface dump prints their members in.
import type { Core, Public, Schema, UID } from '@strapi/strapi';

type MutuallyAssignable<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Lookup<TKey extends keyof Core.Strapi> = Core.Strapi[TKey] extends (
  name: infer TName
) => unknown
  ? TName
  : never;

// Root lookups list registered names for completion: `Registered | (TBase & Record<never, never>)`.
// Without strict types nothing is registered, so they accept exactly develop's names.
export const lookups: [
  MutuallyAssignable<Lookup<'service'>, UID.Service>,
  MutuallyAssignable<Lookup<'controller'>, UID.Controller>,
  MutuallyAssignable<Lookup<'policy'>, string>,
  MutuallyAssignable<Lookup<'middleware'>, string>,
  MutuallyAssignable<Lookup<'plugin'>, string>,
] = [true, true, true, true, true];

// The admin guided tour types its schemas as `Schema.ContentTypes`, develop's
// `Public.ContentTypeSchemas` without strict types.
export const schemas: MutuallyAssignable<Schema.ContentTypes, Public.ContentTypeSchemas> = true;
