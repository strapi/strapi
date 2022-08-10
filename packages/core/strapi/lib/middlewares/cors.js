'use strict';

const { defaultsDeep } = require('lodash/fp');
const cors = require('@koa/cors');

const defaults = {
  origin: '*',
  maxAge: 31536000,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
  headers: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
  keepHeadersOnError: false,
};

/**
 * @type {import('./').MiddlewareFactory}
 */
module.exports = config => {
  const {
    origin,
    expose,
    maxAge,
    credentials,
    methods,
    headers,
    keepHeadersOnError,
  } = defaultsDeep(defaults, config);

  return cors({
    async origin(ctx) {
      let originList;

      if (typeof origin === 'function') {
        originList = await origin(ctx);
      } else {
        originList = origin;
      }

      const whitelist = Array.isArray(originList) ? originList : originList.split(/\s*,\s*/);

      const requestOrigin = ctx.accept.headers.origin;
      if (whitelist.includes('*')) {
        return credentials ? requestOrigin : '*';
      }

      if (!whitelist.includes(requestOrigin)) {
        return ctx.throw(`${requestOrigin} is not a valid origin`);
      }
      return requestOrigin;
    },
    exposeHeaders: expose,
    maxAge,
    credentials,
    allowMethods: methods,
    allowHeaders: headers,
    keepHeadersOnError,
  });
};
