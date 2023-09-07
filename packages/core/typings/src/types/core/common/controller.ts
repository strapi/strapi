import type { Context, Next } from 'koa';

export interface ControllerHandler<TResponse = unknown> {
  (context: Context, next: Next): Promise<TResponse | void> | TResponse | void;
  // [symbol: symbol]: any;
}

export type Controller = Record<string, ControllerHandler>;
