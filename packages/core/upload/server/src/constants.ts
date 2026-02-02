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

const ALLOWED_WEBHOOK_EVENTS = {
  MEDIA_CREATE: 'media.create',
  MEDIA_UPDATE: 'media.update',
  MEDIA_DELETE: 'media.delete',
};

const FOLDER_MODEL_UID = 'plugin::upload.folder';
const FILE_MODEL_UID = 'plugin::upload.file';
const API_UPLOAD_FOLDER_BASE_NAME = 'API Uploads';

export {
  ACTIONS,
  FOLDER_MODEL_UID,
  FILE_MODEL_UID,
  API_UPLOAD_FOLDER_BASE_NAME,
  ALLOWED_SORT_STRINGS,
  ALLOWED_WEBHOOK_EVENTS,
};
