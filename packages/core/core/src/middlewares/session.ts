import fp from 'lodash/fp.js';
import { type SessionOptions, createSession } from 'koa-session';
import type { Core } from '@strapi/types';

const { isEmpty, isArray } = fp;

const defaultConfig = {
  key: 'koa.sess',
  maxAge: 86400000,
  autoCommit: true,
  overwrite: true,
  httpOnly: true,
  signed: true,
  rolling: false,
  renew: false,
  secure: process.env.NODE_ENV === 'production',
  sameSite: undefined,
};

export const session: Core.MiddlewareFactory<Partial<SessionOptions>> = (
  userConfig,
  { strapi }
) => {
  const { keys } = strapi.server.app;
  if (!isArray(keys) || isEmpty(keys) || keys.some(isEmpty)) {
    throw new Error(
      `App keys are required. Please set app.keys in config/server.js (ex: keys: ['myKeyA', 'myKeyB'])`
    );
  }

  const config: Partial<SessionOptions> = { ...defaultConfig, ...userConfig };

  strapi.server.use(createSession(config, strapi.server.app));
};
