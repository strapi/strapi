'use strict';

const { remote } = require('@strapi/data-transfer/lib/strapi');
const { UnauthorizedError } = require('@strapi/utils/lib/errors');

const dataTransferAuthStrategy = require('../../strategies/data-transfer');

/**
 * @param {import('koa').Context} ctx
 * @param {string} [scope]
 */
const verify = async (ctx, scope) => {
  const { auth } = ctx.state;

  if (!auth) {
    throw new UnauthorizedError();
  }

  await dataTransferAuthStrategy.verify(auth, { scope });
};

module.exports = {
  push: remote.handlers.createPushController({ verify }),
};
