import { ExtendableContext } from 'koa';

import type { Strapi } from '.';
import type { IsStrict } from './strictness';

export type PolicyContext = Omit<ExtendableContext, 'is'> & {
  type: string;
  is(name: string): boolean;
};

export type PolicyHandler<TConfig = unknown> = (
  ctx: PolicyContext,
  cfg: TConfig,
  opts: { strapi: Strapi }
) => boolean | undefined;

export type Policy<TConfig = unknown> =
  | {
      name: string;
      validator?: (config: unknown) => boolean;
      handler: PolicyHandler<TConfig>;
    }
  | PolicyHandler<TConfig>;

/** Policy UIDs that have a registered config contract. */
type PolicyName = keyof Strapi.Registries.AppPolicies | keyof Strapi.Registries.PackagePolicies;

/** Resolves application overrides before package defaults. */
export type PolicyConfigFor<TName extends PolicyName> =
  TName extends keyof Strapi.Registries.AppPolicies
    ? Strapi.Registries.AppPolicies[TName]
    : TName extends keyof Strapi.Registries.PackagePolicies
      ? Strapi.Registries.PackagePolicies[TName]
      : never;

/** Runtime resolves exact names first, then relative plugin or API names. */
type PolicyReferenceName<TName extends PolicyName, TNamespace extends string> =
  | TName
  | (TNamespace extends `plugin::${string}` | `api::${string}`
      ? TName extends `${TNamespace}.${infer TRelative}`
        ? TRelative extends PolicyName
          ? never
          : TRelative
        : never
      : never);

/** A reference to a registered policy: its name alone only when its config is optional. */
type RegisteredPolicyReference<TName extends PolicyName, TNamespace extends string> =
  undefined extends PolicyConfigFor<TName>
    ?
        | PolicyReferenceName<TName, TNamespace>
        | { name: PolicyReferenceName<TName, TNamespace>; config?: PolicyConfigFor<TName> }
    : { name: PolicyReferenceName<TName, TNamespace>; config: PolicyConfigFor<TName> };

/**
 * A policy reference in a typed route config.
 * With strict types disabled or without registered policies, any policy name is accepted.
 * With strict types enabled, once any policy is registered, only
 * registered policies are accepted and their `config` is checked: a partial inventory cannot check
 * the `{ name, config }` form for known names while accepting unknown ones.
 * A plugin or API namespace also accepts its relative policy names, with the same config checks.
 */
export type PolicyReference<TNamespace extends string = never> = IsStrict extends false
  ? string | { name: string; config: unknown }
  : [PolicyName] extends [never]
    ? string | { name: string; config: unknown }
    : { [TName in PolicyName]: RegisteredPolicyReference<TName, TNamespace> }[PolicyName];
