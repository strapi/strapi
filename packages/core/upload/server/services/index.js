'use strict';

const provider = require('./provider');
const upload = require('./upload');
const imageManipulation = require('./image-manipulation');
const folder = require('./folder');

module.exports = {
  provider,
  upload,
  folder,
  'image-manipulation': imageManipulation,
};
