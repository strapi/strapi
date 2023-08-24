import type { Context, Next } from 'koa';

export type ControllerHandler<TResponse = unknown> = (
  context: Context,
  next: Next
) => Promise<TResponse | void> | TResponse | void;

export type Controller = Record<string, ControllerHandler>;
