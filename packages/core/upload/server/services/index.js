'use strict';

const uploadService = require('./upload');
const imageManipulation = require('./image-manipulation');

module.exports = {
  upload: uploadService,
  'image-manipulation': imageManipulation,
};
