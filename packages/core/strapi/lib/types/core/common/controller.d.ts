import type { ExtendableContext, Next } from 'koa';

export type ControllerHandler<T = unknown> = (
  context: ExtendableContext,
  next: Next
) => Promise<T | void> | T | void;

export type Controller = Record<string, ControllerHandler>;
