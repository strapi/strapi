import type { MiddlewareFactory } from './types';

export interface Config {
  poweredBy: string;
}

const defaults: Config = {
  poweredBy: 'Strapi <strapi.io>',
};

export const poweredBy: MiddlewareFactory<Partial<Config>> = (config) => {
  const { poweredBy } = { ...defaults, ...config };

  return async (ctx, next) => {
    await next();

    ctx.set('X-Powered-By', poweredBy);
  };
};
