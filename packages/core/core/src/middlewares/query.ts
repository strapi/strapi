import qs from 'qs';
import type Koa from 'koa';
import type { Core } from '@strapi/types';

type Config = Parameters<typeof qs.parse>[1];

const defaults: Config = {
  strictNullHandling: true,
  arrayLimit: 100,
  depth: 20,
};

/**
 * Body parser hook
 */
const addQsParser = (app: Koa, settings: Config) => {
  Object.defineProperty(app.request, 'query', {
    configurable: false,
    enumerable: true,
    /*
     * Get parsed query-string.
     */
    get() {
      const qstr = this.querystring;

      this._querycache = this._querycache || {};
      const cache = this._querycache;

      if (!cache[qstr]) {
        cache[qstr] = qs.parse(qstr, settings);
      }

      return cache[qstr];
    },

    /*
     * Set query-string as an object.
     */
    set(obj) {
      this.querystring = qs.stringify(obj);
    },
  } satisfies PropertyDescriptor & ThisType<Koa.BaseRequest>);

  return app;
};

export const query: Core.MiddlewareFactory = (
  config: Partial<Config>,
  { strapi }: { strapi: Core.Strapi }
) => {
  addQsParser(strapi.server.app, { ...defaults, ...config } as Config);
};
