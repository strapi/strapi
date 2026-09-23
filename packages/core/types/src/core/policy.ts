import { ExtendableContext } from 'koa';

import type { Strapi } from '.';

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
type PolicyName = keyof Strapi.Registries.Policies | keyof Strapi.Registries.DefaultPolicies;

/** Resolves application overrides before package defaults. */
export type PolicyConfigFor<TName extends PolicyName> =
  TName extends keyof Strapi.Registries.Policies
    ? Strapi.Registries.Policies[TName]
    : TName extends keyof Strapi.Registries.DefaultPolicies
      ? Strapi.Registries.DefaultPolicies[TName]
      : never;

/** A reference to a registered policy: its name alone only when its config is optional. */
type RegisteredPolicyReference<TName extends PolicyName> =
  undefined extends PolicyConfigFor<TName>
    ? TName | { name: TName; config?: PolicyConfigFor<TName> }
    : { name: TName; config: PolicyConfigFor<TName> };

/**
 * A policy reference in a typed route config.
 * Without registered policies, any policy name is accepted. Once any policy is registered, only
 * registered policies are accepted and their `config` is checked: a partial inventory cannot check
 * the `{ name, config }` form for known names while accepting unknown ones.
 */
export type PolicyReference = [PolicyName] extends [never]
  ? string | { name: string; config: unknown }
  : { [TName in PolicyName]: RegisteredPolicyReference<TName> }[PolicyName];
