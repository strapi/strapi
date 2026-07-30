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

/**
 * Number of images sent to the AI server per request when generating metadata
 * for an explicit selection. Matches the URL cap of the bulk URL upload flow.
 */
const AI_METADATA_CHUNK_SIZE = 20;

/**
 * Upper bound on a single synchronous AI metadata request.
 *
 * The selection is processed in sequential chunks inside one HTTP request, so
 * an unbounded selection means an unbounded request — long past most proxy and
 * load balancer timeouts, with no way for the client to learn what was written.
 * Rejecting with a 400 lets the UI ask for a smaller selection instead.
 */
const AI_METADATA_MAX_FILES = AI_METADATA_CHUNK_SIZE * 2;

export {
  ACTIONS,
  FOLDER_MODEL_UID,
  FILE_MODEL_UID,
  API_UPLOAD_FOLDER_BASE_NAME,
  ALLOWED_SORT_STRINGS,
  ALLOWED_WEBHOOK_EVENTS,
  AI_METADATA_CHUNK_SIZE,
  AI_METADATA_MAX_FILES,
};
