'use strict';

const { getService } = require('../utils');
const { ACTIONS } = require('../constants');
const { findEntityAndCheckPermissions } = require('./utils/find-entity-and-check-permissions');

const fileModel = 'plugin::upload.file';

module.exports = {
  async find(ctx) {
    const {
      state: { userAbility },
    } = ctx;

    const pm = strapi.admin.services.permission.createPermissionsManager({
      ability: userAbility,
      action: ACTIONS.read,
      model: fileModel,
    });

    if (!pm.isAllowed) {
      return ctx.forbidden();
    }

    const query = pm.addPermissionsQueryTo(ctx.query);

    const { results, pagination } = await getService('upload').findPage(query);

    const sanitizedResults = await pm.sanitizeOutput(results);

    return { results: sanitizedResults, pagination };
  },

  async findOne(ctx) {
    const {
      state: { userAbility },
      params: { id },
    } = ctx;

    const { pm, file } = await findEntityAndCheckPermissions(
      userAbility,
      ACTIONS.read,
      fileModel,
      id
    );

    ctx.body = await pm.sanitizeOutput(file);
  },

  async destroy(ctx) {
    const { id } = ctx.params;
    const { userAbility } = ctx.state;

    const { pm, file } = await findEntityAndCheckPermissions(
      userAbility,
      ACTIONS.update,
      fileModel,
      id
    );

    await getService('upload').remove(file);

    ctx.body = await pm.sanitizeOutput(file, { action: ACTIONS.read });
  },
};
