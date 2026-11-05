import type { DefaultState, ExtendableContext } from 'koa';

import type { Strapi } from '.';

/**
 * The policy context is the Koa context the policy runs against,
 * so it exposes the request `state` (e.g. `state.auth`, `state.user`).
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
) => boolean | undefined | Promise<boolean | undefined>;

export type Policy<TConfig = unknown> =
  | {
      name: string;
      validator?: (config: unknown) => boolean;
      handler: PolicyHandler<TConfig>;
    }
  | PolicyHandler<TConfig>;
