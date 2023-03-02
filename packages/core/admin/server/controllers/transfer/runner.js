'use strict';

const { strapi } = require('@strapi/data-transfer');
const {
  errors: { UnauthorizedError },
} = require('@strapi/utils');

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
  connect: strapi.remote.handlers.createTransferHandler({ verify }),
};
