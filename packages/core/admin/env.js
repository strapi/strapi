'use strict';

const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs-extra');

const dotenvFilePath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(dotenvFilePath)) {
  dotenv.config({ path: dotenvFilePath });
}

const STRAPI_ADMIN = /^STRAPI_ADMIN_/i;

const getClientEnvironment = (useEE, options) => {
  const raw = Object.keys(process.env)
    .filter(key => STRAPI_ADMIN.test(key))
    .reduce(
      (acc, current) => {
        acc[current] = process.env[current];

        return acc;
      },
      {
        ADMIN_PATH: options.adminPath,
        NODE_ENV: process.env.NODE_ENV || 'development',
        STRAPI_ADMIN_BACKEND_URL: options.backend,
        STRAPI_ADMIN_ENABLED_EE_FEATURES: options.features,
        STRAPI_ADMIN_PROJECT_TYPE: useEE ? 'Enterprise' : 'Community',
        STRAPI_ADMIN_SHOW_TUTORIALS: 'true',
        STRAPI_ADMIN_UPDATE_NOTIFICATION: 'true',
      }
    );

  const stringified = {
    'process.env': Object.keys(raw).reduce((env, key) => {
      env[key] = JSON.stringify(raw[key]);
      return env;
    }, {}),
  };

  return { raw, stringified };
};

module.exports = getClientEnvironment;
