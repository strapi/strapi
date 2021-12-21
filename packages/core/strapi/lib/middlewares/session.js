'use strict';

const crypto = require('crypto');
const { defaultsDeep, isEmpty, isString, omit, has } = require('lodash/fp');
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
  secure: false,
  sameSite: null,
};

module.exports = (userConfig, { strapi }) => {
  if (isEmpty(strapi.server.app.keys)) {
    let secretKeys = [];

    if (has('secretKeys', userConfig)) {
      secretKeys = isString(userConfig.secretKeys)
        ? userConfig.secretKeys.split(',')
        : userConfig.secretKeys;
    } else if (has('SESSION_SECRET_KEYS', process.env)) {
      secretKeys = process.env.SESSION_SECRET_KEYS.split(',');
    } else {
      // auto generate secret keys if they are not provided
      for (let i = 0; i < 4; i++) {
        secretKeys.push(crypto.randomBytes(64).toString('hex'));
      }
      strapi.fs.appendFile('.env', `SESSION_SECRET_KEYS=${secretKeys.join(',')}\n`);
      strapi.log.info(
        'The session middleware automatically generated some secret keys and stored them in your .env file under the name SESSION_SECRET_KEYS.'
      );
    }

    strapi.server.app.keys = secretKeys;
  }
  const config = defaultsDeep(defaultConfig, omit('secretKeys', userConfig));

  strapi.server.use(session(config, strapi.server.app));
};
