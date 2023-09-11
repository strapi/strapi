import type { Context } from 'koa';

export interface Controllers {
  [key: string]: (ctx: Context) => Promise<unknown> | unknown;
}
