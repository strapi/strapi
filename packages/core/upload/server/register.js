'use strict';

const { PayloadTooLargeError } = require('@strapi/utils/lib/errors');
const _ = require('lodash');
const registerUploadMiddleware = require('./middlewares/upload');
const { kbytesToBytes } = require('./utils/file');

/**
 * Register upload plugin
 * @param {{ strapi: import('@strapi/strapi').Strapi }}
 */
module.exports = async ({ strapi }) => {
  strapi.plugin('upload').provider = createProvider(strapi.config.get('plugin.upload', {}));

  await registerUploadMiddleware({ strapi });

  if (strapi.plugin('graphql')) {
    require('./graphql')({ strapi });
  }
};

const createProvider = (config) => {
  const { providerOptions, actionOptions = {} } = config;

  const providerName = _.toLower(config.provider);
  let provider;

  let modulePath;
  try {
    modulePath = require.resolve(`@strapi/provider-upload-${providerName}`);
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      modulePath = providerName;
    } else {
      throw error;
    }
  }

  try {
    provider = require(modulePath);
  } catch (err) {
    const newError = new Error(`Could not load upload provider "${providerName}".`);
    newError.stack = err.stack;
    throw newError;
  }

  const providerInstance = provider.init(providerOptions);

  if (!providerInstance.delete) {
    throw new Error(`The upload provider "${providerName}" doesn't implement the delete method.`);
  }

  if (!providerInstance.upload && !providerInstance.uploadStream) {
    throw new Error(
      `The upload provider "${providerName}" doesn't implement the uploadStream nor the upload method.`
    );
  }

  if (!providerInstance.uploadStream) {
    process.emitWarning(
      `The upload provider "${providerName}" doesn't implement the uploadStream function. Strapi will fallback on the upload method. Some performance issues may occur.`
    );
  }

  if (providerOptions.sizeLimit) {
    // TODO V5: remove sizeLimit from providerOptions
    process.emitWarning(
      `[deprecated] In future versions, "sizeLimit" argument will be ignored from upload.config.providerOptions. Move it to upload.config`
    );
  }

  if (!providerInstance.checkFileSize) {
    providerInstance.checkFileSize = (file) => {
      const fileSize = kbytesToBytes(file.size);

      if (providerOptions.sizeLimit && fileSize > providerOptions.sizeLimit) {
        throw new PayloadTooLargeError();
      } else if (config.sizeLimit && fileSize > config.sizeLimit) {
        throw new PayloadTooLargeError();
      }
    };
  }

  const wrappedProvider = _.mapValues(providerInstance, (method, methodName) => {
    return async function (file, options = actionOptions[methodName]) {
      return providerInstance[methodName](file, options);
    };
  });

  return Object.assign(Object.create(baseProvider), wrappedProvider);
};

const baseProvider = {
  extend(obj) {
    Object.assign(this, obj);
  },
};
