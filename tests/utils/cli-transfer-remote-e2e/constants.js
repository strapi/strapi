'use strict';

/**
 * Upload filenames produced by seed-media.js; upload-db.js filters on the same prefix.
 * Keep in sync: only this module defines the string.
 */
const SEED_UPLOAD_NAME_PREFIX = 'cli-pull-seed-';
/** SQLite LIKE pattern (includes wildcard). */
const SEED_UPLOAD_NAME_LIKE = `${SEED_UPLOAD_NAME_PREFIX}%`;

module.exports = {
  SEED_UPLOAD_NAME_PREFIX,
  SEED_UPLOAD_NAME_LIKE,
};
