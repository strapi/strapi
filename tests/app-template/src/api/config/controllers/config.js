'use strict';

const { createTestTransferToken } = require('../../../create-transfer-token');
const resyncSuperAdminAfterImport = require('../utils/resync-super-admin-after-import');
const resetAdminFixtureData = require('../utils/reset-admin-fixture');
const resetFixtureData = require('../utils/reset-fixture');
const isLoopbackAddress = require('../utils/is-loopback-address');

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
  async resetAdminFixture(ctx) {
    if (!isLoopbackAddress(ctx.req?.socket?.remoteAddress)) {
      ctx.throw(403, 'Admin fixture reset is only available from the loopback interface');
    }

    await resetAdminFixtureData(strapi, ctx.request.body.fixture);

    ctx.send(200);
  },
  /**
   * Restore a whole e2e fixture in-process (admin entities, test transfer token, then every other
   * included type and the configuration). See `utils/reset-fixture.js`.
   */
  async resetFixture(ctx) {
    if (!isLoopbackAddress(ctx.req?.socket?.remoteAddress)) {
      ctx.throw(403, 'Fixture reset is only available from the loopback interface');
    }

    const { fixture, includedTypes, configuration } = ctx.request.body ?? {};

    await resetFixtureData(strapi, { fixture, includedTypes, configuration });

    ctx.send(200);
  },
};
