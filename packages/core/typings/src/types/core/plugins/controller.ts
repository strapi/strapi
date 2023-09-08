import type { Context } from 'koa';

export interface Controller {
  [key: string]: (ctx: Context) => Promise<unknown> | unknown;
}
