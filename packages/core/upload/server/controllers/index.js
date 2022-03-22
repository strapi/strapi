'use strict';

const adminFile = require('./admin-file');
const adminFolder = require('./admin-folder');
const adminSettings = require('./admin-settings');
const adminUpload = require('./admin-upload');
const contentApi = require('./content-api');

module.exports = {
  'admin-file': adminFile,
  'admin-folder': adminFolder,
  'admin-settings': adminSettings,
  'admin-upload': adminUpload,
  'content-api': contentApi,
};
