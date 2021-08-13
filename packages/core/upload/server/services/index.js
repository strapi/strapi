'use strict';

const uploadService = require('../../services/upload');
const imageManipulation = require('../../services/image-manipulation');

module.exports = {
  upload: uploadService,
  'image-manipulation': imageManipulation,
};
