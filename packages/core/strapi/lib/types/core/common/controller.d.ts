import type { ExtendableContext, Next } from 'koa';

export type ControllerHandler = <TResponse>(
  context: ExtendableContext,
  next: Next
) => Promise<TResponse | void> | TResponse | void;

export type Controller = Record<string, ControllerHandler>;
