'use strict';

const providerService = require('./provider');
const uploadService = require('./upload');
const imageManipulation = require('./image-manipulation');

module.exports = {
  provider: providerService,
  upload: uploadService,
  'image-manipulation': imageManipulation,
};
