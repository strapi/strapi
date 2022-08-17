'use strict';

const { PayloadTooLargeError } = require('@strapi/utils/lib/errors');
const { isFunction } = require('lodash/fp');
const { streamToBuffer, kbytesToBytes } = require('../utils/file');

module.exports = ({ strapi }) => ({
  async upload(file) {
    const config = strapi.config.get('plugin.upload');
    const fileSize = kbytesToBytes(file.size);

    if (config.sizeLimit && fileSize > config.sizeLimit) {
      throw new PayloadTooLargeError();
    }

    if (isFunction(strapi.plugin('upload').provider.uploadStream)) {
      file.stream = file.getStream();
      await strapi.plugin('upload').provider.uploadStream(file);
      delete file.stream;
    } else {
      file.buffer = await streamToBuffer(file.getStream());
      await strapi.plugin('upload').provider.upload(file);
      delete file.buffer;
    }
  },
});
