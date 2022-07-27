'use strict';

const { merge } = require('lodash/fp');
const { getService } = require('../utils');
const { ACTIONS, FILE_MODEL_UID } = require('../constants');
const { findEntityAndCheckPermissions } = require('./utils/find-entity-and-check-permissions');

module.exports = {
  async find(ctx) {
    const {
      state: { userAbility },
    } = ctx;

    const defaultQuery = { populate: { folder: true } };

    const pm = strapi.admin.services.permission.createPermissionsManager({
      ability: userAbility,
      action: ACTIONS.read,
      model: FILE_MODEL_UID,
    });

    if (!pm.isAllowed) {
      return ctx.forbidden();
    }

    const query = pm.addPermissionsQueryTo(merge(defaultQuery, ctx.query));

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
      FILE_MODEL_UID,
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
      FILE_MODEL_UID,
      id
    );

    const [body] = await Promise.all([
      pm.sanitizeOutput(file, { action: ACTIONS.read }),
      getService('upload').remove(file),
    ]);

    ctx.body = body;
  },
};
