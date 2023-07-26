'use strict';

const { isFunction } = require('lodash/fp');
const {
  file: { streamToBuffer },
} = require('@strapi/utils');

module.exports = ({ strapi }) => ({
  async checkFileSize(file) {
    const { sizeLimit } = strapi.config.get('plugin.upload', {});
    await strapi.plugin('upload').provider.checkFileSize(file, { sizeLimit });
  },
  async upload(file) {
    if (isFunction(strapi.plugin('upload').provider.uploadStream)) {
      file.stream = file.getStream();
      await strapi.plugin('upload').provider.uploadStream(file);
      file.stream.close();
      file.stream.destroy();
      delete file.stream;
    } else {
      file.buffer = await streamToBuffer(file.getStream());
      await strapi.plugin('upload').provider.upload(file);
      delete file.buffer;
    }
  },
});
