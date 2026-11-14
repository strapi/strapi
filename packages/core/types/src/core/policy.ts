import type { DefaultState, ExtendableContext } from 'koa';

import type { Strapi } from '.';

/**
 * The policy context is a copy of the own properties of the context the policy runs against.
 * For REST routes that is the Koa context, so it exposes the request `state`
 * (e.g. `state.auth`, `state.user`) and `request`; Koa's delegated getters and methods
 * (e.g. `query`, `throw`) are not copied, so read them from `request`
 * (e.g. `policyContext.request.query`).
 * Other callers, such as GraphQL resolvers, build their own context, which may have no
 * `request`, so check the properties you read.
 */
export type PolicyContext = Omit<ExtendableContext, 'is'> & {
  type: string;
  state?: DefaultState;
  is(name: string): boolean;
};

export type PolicyHandler<TConfig = unknown> = (
  ctx: PolicyContext,
  cfg: TConfig,
  opts: { strapi: Strapi }
) => boolean | void | Promise<boolean | void>;

export type Policy<TConfig = unknown> =
  | {
      name: string;
      validator?: (config: unknown) => boolean;
      handler: PolicyHandler<TConfig>;
    }
  | PolicyHandler<TConfig>;
