'use strict';

const _ = require('lodash');
const { ApplicationError } = require('@strapi/utils').errors;
const { getService } = require('../utils');
const { ACTIONS, FILE_MODEL_UID } = require('../constants');
const validateUploadBody = require('./validation/admin/upload');
const { findEntityAndCheckPermissions } = require('./utils/find-entity-and-check-permissions');

module.exports = {
  async updateFileInfo(ctx) {
    const {
      state: { userAbility, user },
      query: { id },
      request: { body },
    } = ctx;

    const uploadService = getService('upload');
    const { pm } = await findEntityAndCheckPermissions(
      userAbility,
      ACTIONS.update,
      FILE_MODEL_UID,
      id
    );

    user.adminUserId = strapi.service('admin::user').generateAdminHashFromContext(ctx);

    const data = await validateUploadBody(body);
    const file = await uploadService.updateFileInfo(id, data.fileInfo, { user });

    ctx.body = await pm.sanitizeOutput(file, { action: ACTIONS.read });
  },

  async replaceFile(ctx) {
    const {
      state: { userAbility, user },
      query: { id },
      request: { body, files: { files } = {} },
    } = ctx;

    const uploadService = getService('upload');
    const { pm } = await findEntityAndCheckPermissions(
      userAbility,
      ACTIONS.update,
      FILE_MODEL_UID,
      id
    );

    if (Array.isArray(files)) {
      throw new ApplicationError('Cannot replace a file with multiple ones');
    }

    user.adminUserId = strapi.service('admin::user').generateAdminHashFromContext(ctx);

    const data = await validateUploadBody(body);
    const replacedFiles = await uploadService.replace(id, { data, file: files }, { user });

    ctx.body = await pm.sanitizeOutput(replacedFiles, { action: ACTIONS.read });
  },

  async uploadFiles(ctx) {
    const {
      state: { userAbility, user },
      request: { body, files: { files } = {} },
    } = ctx;

    const uploadService = getService('upload');
    const pm = strapi.admin.services.permission.createPermissionsManager({
      ability: userAbility,
      action: ACTIONS.create,
      model: FILE_MODEL_UID,
    });

    if (!pm.isAllowed) {
      return ctx.forbidden();
    }

    user.adminUserId = strapi.service('admin::user').generateAdminHashFromContext(ctx);

    const data = await validateUploadBody(body);
    const uploadedFiles = await uploadService.upload({ data, files }, { user });

    ctx.body = await pm.sanitizeOutput(uploadedFiles, { action: ACTIONS.read });
  },

  async upload(ctx) {
    const {
      query: { id },
      request: { files: { files } = {} },
    } = ctx;

    if (_.isEmpty(files) || files.size === 0) {
      if (id) {
        return this.updateFileInfo(ctx);
      }

      throw new ApplicationError('Files are empty');
    }

    await (id ? this.replaceFile : this.uploadFiles)(ctx);
  },
};
