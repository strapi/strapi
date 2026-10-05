import type { Context } from 'koa';

/** Type partial HTTP test contexts at the boundary without requiring a running Koa application. */
export const createMockContext = <T extends object>(context: T) =>
  context as Omit<T, 'params' | 'query' | 'state'> & Context;
