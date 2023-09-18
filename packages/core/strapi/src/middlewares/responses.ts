import { isFunction } from 'lodash/fp';
import type { Common } from '@strapi/types';

export interface Config {
  handlers?: Record<number, Common.MiddlewareHandler>;
}

export const responses: Common.MiddlewareFactory<Config> = (config = {}) => {
  return async (ctx, next) => {
    await next();

    const { status } = ctx;
    const handler = config?.handlers?.[status];

    if (isFunction(handler)) {
      await handler(ctx, next);
    }
  };
};
