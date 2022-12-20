'use strict';

const ACTIONS = {
  read: 'plugin::upload.read',
  readSettings: 'plugin::upload.settings.read',
  create: 'plugin::upload.assets.create',
  update: 'plugin::upload.assets.update',
  download: 'plugin::upload.assets.download',
  copyLink: 'plugin::upload.assets.copy-link',
  configureView: 'plugin::upload.configure-view',
};

const ALLOWED_SORT_STRINGS = [
  'createdAt:DESC',
  'createdAt:ASC',
  'name:ASC',
  'name:DESC',
  'updatedAt:DESC',
  'updatedAt:ASC',
];

module.exports = {
  ACTIONS,
  FOLDER_MODEL_UID: 'plugin::upload.folder',
  FILE_MODEL_UID: 'plugin::upload.file',
  API_UPLOAD_FOLDER_BASE_NAME: 'API Uploads',
  ALLOWED_SORT_STRINGS,
};
