import { existsSync } from 'fs';
import { resolve } from 'path';
import koaFavicon from 'koa-favicon';
import type { Core } from '@strapi/types';

export type Config = NonNullable<Parameters<typeof koaFavicon>[1]>;

const defaults = {
  path: 'favicon.png',
  maxAge: 86400000,
};

export const favicon: Core.MiddlewareFactory<Config> = (config, { strapi }) => {
  const { maxAge, path: faviconDefaultPath } = { ...defaults, ...config };
  const { root: appRoot } = strapi.dirs.app;
  let faviconPath = faviconDefaultPath;

  /** TODO (v5): Updating the favicon to use a png caused
   *  https://github.com/strapi/strapi/issues/14693
   *
   *  This check ensures backwards compatibility until
   *  the next major version
   */
  if (!existsSync(resolve(appRoot, faviconPath))) {
    faviconPath = 'favicon.ico';
  }

  return koaFavicon(resolve(appRoot, faviconPath), { maxAge });
};
