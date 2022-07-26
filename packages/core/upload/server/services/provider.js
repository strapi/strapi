'use strict';

const { isFunction } = require('lodash/fp');
const { streamToBuffer } = require('../utils/file');

module.exports = ({ strapi }) => ({
  async generateFileName(filename) {
    if (isFunction(strapi.plugin('upload').provider.generateFileName)) {
      return strapi.plugin('upload').provider.generateFileName(filename);
    }
  },
  
  async upload(file) {
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
