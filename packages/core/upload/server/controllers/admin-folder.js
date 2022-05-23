'use strict';

const { defaultsDeep } = require('lodash/fp');
const { getService } = require('../utils');
const { FOLDER_MODEL_UID } = require('../constants');
const { validateCreateFolder, validateUpdateFolder } = require('./validation/admin/folder');

module.exports = {
  async findOne(ctx) {
    const {
      params: { id },
    } = ctx.request;

    const permissionsManager = strapi.admin.services.permission.createPermissionsManager({
      ability: ctx.state.userAbility,
      model: FOLDER_MODEL_UID,
    });

    const { results } = await strapi.entityService.findWithRelationCountsPage(FOLDER_MODEL_UID, {
      filters: { id },
      populate: {
        children: {
          count: true,
        },
        files: {
          count: true,
        },
      },
    });

    if (results.length === 0) {
      return ctx.notFound('folder not found');
    }

    ctx.body = {
      data: await permissionsManager.sanitizeOutput(results[0]),
    };
  },

  async find(ctx) {
    const permissionsManager = strapi.admin.services.permission.createPermissionsManager({
      ability: ctx.state.userAbility,
      model: FOLDER_MODEL_UID,
    });

    const results = await strapi.entityService.findWithRelationCounts(FOLDER_MODEL_UID, {
      ...defaultsDeep(
        {
          populate: {
            children: {
              count: true,
            },
            files: {
              count: true,
            },
          },
        },
        ctx.query
      ),
    });

    ctx.body = {
      data: await permissionsManager.sanitizeOutput(results),
    };
  },
  async create(ctx) {
    const { user } = ctx.state;
    const { body } = ctx.request;

    await validateCreateFolder(body);

    const folderService = getService('folder');

    const folder = await folderService.create(body, { user });

    const permissionsManager = strapi.admin.services.permission.createPermissionsManager({
      ability: ctx.state.userAbility,
      model: FOLDER_MODEL_UID,
    });

    ctx.body = {
      data: await permissionsManager.sanitizeOutput(folder),
    };
  },

  async update(ctx) {
    const { user } = ctx.state;
    const {
      body,
      params: { id },
    } = ctx.request;

    const permissionsManager = strapi.admin.services.permission.createPermissionsManager({
      ability: ctx.state.userAbility,
      model: FOLDER_MODEL_UID,
    });

    await validateUpdateFolder(id)(body);

    const folderService = getService('folder');

    const updatedFolder = await folderService.update(id, body, { user });

    if (!updatedFolder) {
      return ctx.notFound('folder not found');
    }

    ctx.body = {
      data: await permissionsManager.sanitizeOutput(updatedFolder),
    };
  },

  async getStructure(ctx) {
    const { getStructure } = getService('folder');

    const structure = await getStructure();

    ctx.body = {
      data: structure,
    };
  },
};
