import fp from 'lodash/fp.js';
import type { Core } from '@strapi/types';

const { isFunction } = fp;

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
