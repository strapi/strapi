import { isFunction } from 'lodash/fp';
import type { MiddlewareFactory, Middleware } from './types';

export interface Config {
  handlers?: Record<number, Middleware>;
}

export const responses: MiddlewareFactory<Config> = (config = {}) => {
  return async (ctx, next) => {
    await next();

    const { status } = ctx;
    const handler = config?.handlers?.[status];

    if (isFunction(handler)) {
      await handler(ctx, next);
    }
  };
};
