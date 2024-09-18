import 'koa-body';
import type { Context, Next } from 'koa';

export type Controller = Record<string, ControllerHandler>;
export interface ControllerHandler<TResponse = unknown> {
  (context: Context, next: Next): Promise<TResponse | void> | TResponse | void;
}
