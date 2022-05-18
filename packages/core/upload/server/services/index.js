'use strict';

const provider = require('./provider');
const upload = require('./upload');
const imageManipulation = require('./image-manipulation');
const folder = require('./folder');
const file = require('./file');
const apiUploadFolder = require('./api-upload-folder');

module.exports = {
  provider,
  upload,
  folder,
  file,
  'image-manipulation': imageManipulation,
  'api-upload-folder': apiUploadFolder,
};
