import { ExtendableContext } from 'koa';

import type { Strapi } from '.';
import type { SuggestedString } from '../utils/string';
import type { IsStrict, RegisteredRecord } from './strictness';

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
export type RegisteredPolicyName =
  | keyof Strapi.Registries.AppPolicies
  | keyof Strapi.Registries.PackagePolicies;

/** Resolves application overrides before package defaults. */
export type PolicyConfigFor<TName extends RegisteredPolicyName> =
  TName extends keyof Strapi.Registries.AppPolicies
    ? Strapi.Registries.AppPolicies[TName]
    : TName extends keyof Strapi.Registries.PackagePolicies
      ? Strapi.Registries.PackagePolicies[TName]
      : never;

/**
 * Policies keyed by UID, e.g. `strapi.policies`. With strict types enabled, registered UIDs resolve to a
 * policy that receives their config contract. Other keys, literal or dynamic, resolve to the legacy policy.
 */
export type PolicyMap = IsStrict extends false
  ? Record<string, Policy>
  : RegisteredRecord<{ [TName in RegisteredPolicyName]: Policy<PolicyConfigFor<TName>> }, Policy>;

/** Runtime resolves exact names first, then relative plugin or API names. */
type PolicyReferenceName<TName extends RegisteredPolicyName, TNamespace extends string> =
  | TName
  | (TNamespace extends `plugin::${string}` | `api::${string}`
      ? TName extends `${TNamespace}.${infer TRelative}`
        ? TRelative extends RegisteredPolicyName
          ? never
          : TRelative
        : never
      : never);

/** A reference to a registered policy: its name alone only when its config is optional. */
type RegisteredPolicyReference<TName extends RegisteredPolicyName, TNamespace extends string> =
  undefined extends PolicyConfigFor<TName>
    ?
        | PolicyReferenceName<TName, TNamespace>
        | { name: PolicyReferenceName<TName, TNamespace>; config?: PolicyConfigFor<TName> }
    : { name: PolicyReferenceName<TName, TNamespace>; config: PolicyConfigFor<TName> };

/** Any policy name. Registered names, and their relative forms in `TNamespace`, are listed for completion. */
type SuggestedPolicyName<TNamespace extends string> = SuggestedString<
  PolicyReferenceName<RegisteredPolicyName, TNamespace>
>;

/**
 * A policy reference in a typed route config.
 * With strict types disabled, any policy name is accepted; registered names are listed for completion.
 * With strict types enabled, only registered policies are accepted and their `config` is checked:
 * a partial inventory cannot check the `{ name, config }` form for known names while accepting
 * unknown ones. Without registered policies, no reference is accepted.
 * A plugin or API namespace also accepts its relative policy names, with the same config checks.
 */
export type PolicyReference<TNamespace extends string = never> = IsStrict extends false
  ? SuggestedPolicyName<TNamespace> | { name: SuggestedPolicyName<TNamespace>; config: unknown }
  : {
      [TName in RegisteredPolicyName]: RegisteredPolicyReference<TName, TNamespace>;
    }[RegisteredPolicyName];
