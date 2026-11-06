import type { DefaultState, ExtendableContext } from 'koa';

import type { Strapi } from '.';

/**
 * The policy context is a copy of the own properties of the Koa context the policy runs
 * against, so it exposes the request `state` (e.g. `state.auth`, `state.user`).
 * Koa's delegated getters and methods (e.g. `query`, `throw`) are not copied, so read them
 * from `request` (e.g. `policyContext.request.query`).
 */
export type PolicyContext = Omit<ExtendableContext, 'is'> & {
  type: string;
  state: DefaultState;
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
