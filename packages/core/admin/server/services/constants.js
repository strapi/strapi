'use strict';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

module.exports = {
  CONTENT_TYPE_SECTION: 'contentTypes',
  SUPER_ADMIN_CODE: 'strapi-super-admin',
  EDITOR_CODE: 'strapi-editor',
  AUTHOR_CODE: 'strapi-author',
  READ_ACTION: 'plugin::content-manager.explorer.read',
  CREATE_ACTION: 'plugin::content-manager.explorer.create',
  UPDATE_ACTION: 'plugin::content-manager.explorer.update',
  DELETE_ACTION: 'plugin::content-manager.explorer.delete',
  PUBLISH_ACTION: 'plugin::content-manager.explorer.publish',
  API_TOKEN_TYPE: {
    READ_ONLY: 'read-only',
    FULL_ACCESS: 'full-access',
    CUSTOM: 'custom',
  },
  // The front-end only displays these values
  API_TOKEN_LIFESPANS: {
    UNLIMITED: null,
    DAYS_7: 7 * DAY_IN_MS,
    DAYS_30: 30 * DAY_IN_MS,
    DAYS_90: 90 * DAY_IN_MS,
  },
  TRANSFER_TOKEN_TYPE: {
    PUSH: 'push',
    PULL: 'pull',
  },
  TRANSFER_TOKEN_LIFESPANS: {
    UNLIMITED: null,
    DAYS_7: 7 * DAY_IN_MS,
    DAYS_30: 30 * DAY_IN_MS,
    DAYS_90: 90 * DAY_IN_MS,
  },
};
