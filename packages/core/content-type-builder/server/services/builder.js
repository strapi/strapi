'use strict';

module.exports = () => ({
  getReservedNames() {
    return {
      collectionNames: [
        'strapi_migrations',
        'strapi_database_schema',
        'strapi_core_store_settings',
        'strapi_webhooks',
        'admin_users',
        'admin_permissions',
        'admin_roles',
        'strapi_api_tokens',
        'files',
        'upload_folders',
        'i18n_locale',
        'up_permissions',
        'up_roles',
        'up_users',
        'admin_permissions_role_links',
        'admin_users_roles_links',
        'files_related_morphs',
        'files_folder_links',
        'upload_folders_parent_links',
        'up_permissions_role_links',
        'up_users_role_links',
      ],
      models: ['boolean', 'date', 'date-time', 'dateTime', 'time', 'upload'],
      attributes: [
        'id',
        'created_at',
        'createdAt',
        'updated_at',
        'updatedAt',
        'created_by',
        'createdBy',
        'updated_by',
        'updatedBy',
        'published_at',
        'publishedAt',
      ],
    };
    // strapi.db.getReservedNames();
  },
});
