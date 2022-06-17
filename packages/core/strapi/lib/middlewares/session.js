'use strict';

const { defaultsDeep, isEmpty, isArray } = require('lodash/fp');
const session = require('koa-session');

const defaultConfig = {
  key: 'koa.sess',
  maxAge: 86400000,
  autoCommit: true,
  overwrite: true,
  httpOnly: true,
  signed: true,
  rolling: false,
  renew: false,
  secure: process.env.NODE_ENV === 'production' ? true : false,
  sameSite: null,
};

module.exports = (userConfig, { strapi }) => {
  const keys = strapi.server.app.keys;
  if (!isArray(keys) || isEmpty(keys) || keys.some(isEmpty)) {
    throw new Error(
      `App keys are required. Please set app.keys in config/server.js (ex: keys: ['myKeyA', 'myKeyB'])`
    );
  }

  const config = defaultsDeep(defaultConfig, userConfig);

  strapi.server.use(session(config, strapi.server.app));
};
