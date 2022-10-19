'use strict';

const adminFile = require('./admin-file');
const adminFolder = require('./admin-folder');
const adminFolderFile = require('./admin-folder-file');
const adminSettings = require('./admin-settings');
const adminUpload = require('./admin-upload');
const contentApi = require('./content-api');
const uploadConfig = require('./upload-config');

module.exports = {
  'admin-file': adminFile,
  'admin-folder': adminFolder,
  'admin-folder-file': adminFolderFile,
  'admin-settings': adminSettings,
  'admin-upload': adminUpload,
  'content-api': contentApi,
  'upload-config': uploadConfig,
};
