import {
  AI_METADATA_CHUNK_SIZE,
  AI_METADATA_MAX_FILES,
  AI_METADATA_SUPPORTED_IMAGE_TYPES,
} from '../../shared/constants';

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

// Sharp's own built-in decode ceiling (0x3FFF * 0x3FFF). Used as the default for
// plugin::upload.security.maxImageResolution so the guard is a no-op out of the box;
// memory-constrained hosts can lower it to reject large images before sharp decodes them.
const DEFAULT_MAX_IMAGE_RESOLUTION = 268402689;

export {
  ACTIONS,
  FOLDER_MODEL_UID,
  FILE_MODEL_UID,
  API_UPLOAD_FOLDER_BASE_NAME,
  ALLOWED_SORT_STRINGS,
  ALLOWED_WEBHOOK_EVENTS,
  DEFAULT_MAX_IMAGE_RESOLUTION,
  // Re-exported from `shared/` so the admin panel can gate on the same values.
  AI_METADATA_CHUNK_SIZE,
  AI_METADATA_MAX_FILES,
  AI_METADATA_SUPPORTED_IMAGE_TYPES,
};
