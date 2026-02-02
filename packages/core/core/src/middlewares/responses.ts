import { isFunction } from 'lodash/fp';
import type { Core } from '@strapi/types';

export interface Config {
  handlers?: Record<number, Core.MiddlewareHandler>;
}

export const responses: Core.MiddlewareFactory<Config> = (config = {}) => {
  return async (ctx, next) => {
    await next();

    const { status } = ctx;
    const handler = config?.handlers?.[status];

    if (isFunction(handler)) {
      await handler(ctx, next);
    }
  };
};
