// @ts-ignore - TS Build sometimes fails on this import, probably because of the circular dependency with DT
import { strapi as dataTransferStrapi } from '@strapi/data-transfer';
import { errors } from '@strapi/utils';
import dataTransferAuthStrategy from '../../strategies/data-transfer';

const {
  remote: {
    handlers: { createPushController, createPullController },
  },
} = dataTransferStrapi;

const { UnauthorizedError } = errors;

/**
 * @param {import('koa').Context} ctx
 * @param {string} [scope]
 */
const verify = async (ctx: any, scope: any) => {
  const { auth } = ctx.state;

  if (!auth) {
    throw new UnauthorizedError();
  }

  await dataTransferAuthStrategy.verify(auth, { scope });
};

export = {
  push: createPushController({ verify }),
  pull: createPullController({ verify }),
};
