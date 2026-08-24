'use strict';

/**
 * E2E-only: after DTS import, rebuild generated-app Content Manager configuration and then
 * rebuild Super Admin permissions from the app's registered actions.
 *
 * DTS restores DB rows from a frozen snapshot, while the test app's registered content types can
 * move independently. If we only rebuild Super Admin permissions, homepage widgets can hit content
 * types that do not have matching CM core-store configuration. If we only preserve imported CT
 * permissions, newly registered content types appear in the matrix but are disabled for Super Admin.
 *
 * @param {import('@strapi/strapi').Strapi} strapi
 */
module.exports = async function resyncSuperAdminAfterImport(strapi) {
  const roleService = strapi.service('admin::role');
  const contentManagerContentTypesService = strapi
    .plugin('content-manager')
    .service('content-types');

  await contentManagerContentTypesService.syncConfigurations();
  await roleService.resetSuperAdminPermissions();
};
