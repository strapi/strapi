'use strict';

const errorService = require('./errors');
const uploadService = require('./upload');
const imageManipulation = require('./image-manipulation');

module.exports = {
  errors: errorService,
  upload: uploadService,
  'image-manipulation': imageManipulation,
};
