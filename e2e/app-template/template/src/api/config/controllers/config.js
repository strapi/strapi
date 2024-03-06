const { createTestTransferToken } = require('../../../create-transfer-token');

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
  async resetTransferToken(ctx) {
    await createTestTransferToken(strapi);

    ctx.send(200);
  },
};
