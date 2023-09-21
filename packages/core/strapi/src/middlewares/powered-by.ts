import type { Common } from '@strapi/types';

export interface Config {
  poweredBy: string;
}

const defaults: Config = {
  poweredBy: 'Strapi <strapi.io>',
};

export const poweredBy: Common.MiddlewareFactory<Partial<Config>> = (config) => {
  const { poweredBy } = { ...defaults, ...config };

  return async (ctx, next) => {
    await next();

    ctx.set('X-Powered-By', poweredBy);
  };
};
