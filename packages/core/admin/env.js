'use strict';

const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs-extra');

const dotenvFilePath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(dotenvFilePath)) {
  dotenv.config({ path: dotenvFilePath });
}

const STRAPI_ADMIN = /^STRAPI_ADMIN_/i;

const getClientEnvironment = options => {
  const raw = Object.keys(process.env)
    .filter(key => STRAPI_ADMIN.test(key))
    .reduce(
      (acc, current) => {
        acc[current] = process.env[current];

        return acc;
      },
      {
        ADMIN_PATH: options.adminPath,
        NODE_ENV: options.env || 'development',
        STRAPI_ADMIN_BACKEND_URL: options.backend,
      }
    );

  const stringified = {
    'process.env': Object.keys(raw).reduce((env, key) => {
      env[key] = JSON.stringify(raw[key]);
      return env;
    }, {}),
  };

  return stringified;
};

module.exports = getClientEnvironment;
