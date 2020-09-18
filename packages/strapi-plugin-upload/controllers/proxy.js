'use strict';

const _ = require('lodash');
const fetch = require('node-fetch');
const isValidDomain = require('is-valid-domain');

module.exports = {
  async uploadProxy(ctx) {
    try {
      const url = new URL(ctx.query.url);

      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Unexpected url protocol');
      }

      if (!isValidDomain(url.hostname)) {
        throw new Error('Invalid url hostname');
      }
    } catch (err) {
      ctx.status = 400;
      ctx.body = 'Invalid URL';
      return;
    }

    try {
      const res = await fetch(new URL(ctx.query.url), {
        headers: _.omit(ctx.request.headers, ['origin', 'host', 'authorization']),
      });

      for (const [key, value] of res.headers.entries()) {
        ctx.set(key, value);
      }

      ctx.status = res.status;
      ctx.body = res.body;
    } catch (err) {
      strapi.log.error(err);
      ctx.status = 500;
      ctx.body = 'Internal Server Error';
    }
  },
};
