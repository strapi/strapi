'use strict';

const provider = require('./provider');
const upload = require('./upload');
const imageManipulation = require('./image-manipulation');
const imageManipulationV2 = require('./image-manipulation-v2');
const folder = require('./folder');
const file = require('./file');
const weeklyMetrics = require('./metrics/weekly-metrics');
const metrics = require('./metrics');
const apiUploadFolder = require('./api-upload-folder');
const extensions = require('./extensions');

module.exports = {
  provider,
  upload,
  folder,
  file,
  weeklyMetrics,
  metrics,
  'image-manipulation': imageManipulation,
  'api-upload-folder': apiUploadFolder,
  'image-manipulation-v2': imageManipulationV2,
  extensions,
};
