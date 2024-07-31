import type { ParameterizedContext } from 'koa';

export interface RequestContext {
  get(): ParameterizedContext | undefined;
  run(store: ParameterizedContext, cb: () => Promise<void>): Promise<void>;
}
