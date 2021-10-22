'use strict';

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
  },
};
