const { createTestTransferToken } = require('../../../create-transfer-token');
const resyncSuperAdminAfterImport = require('../utils/resync-super-admin-after-import');

module.exports = {
  rateLimitEnable(ctx) {
    const { value } = ctx.request.body;

    const configService = strapi.service('api::config.config');

    configService.rateLimitEnable(value);

    ctx.send(200);
  },
  async permissionsPrune(ctx) {
    const permissionService = strapi.service('admin::permission');

    await permissionService.cleanPermissionsInDatabase();

    ctx.send(200);
  },
  /**
   * After DTS import: E2E-only CM configuration sync + Super Admin permission reset.
   */
  async permissionsResyncSuperAdmin(ctx) {
    await resyncSuperAdminAfterImport(strapi);
    ctx.send(200);
  },
  async resetTransferToken(ctx) {
    await createTestTransferToken(strapi);

    ctx.send(200);
  },
};
