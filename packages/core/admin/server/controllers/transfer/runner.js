'use strict';

const { createTransferHandler } = require('@strapi/data-transfer').strapi.remote.handlers;
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
  connect: createTransferHandler({ verify }),
};
