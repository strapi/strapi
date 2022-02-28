'use strict';

const _ = require('lodash');
const { contentTypes: contentTypesUtils } = require('@strapi/utils');
const { ApplicationError, NotFoundError, ForbiddenError } = require('@strapi/utils').errors;
const { getService } = require('../utils');
const validateSettings = require('./validation/settings');
const validateUploadBody = require('./validation/upload');

const { CREATED_BY_ATTRIBUTE } = contentTypesUtils.constants;

const ACTIONS = {
  read: 'plugin::upload.read',
  readSettings: 'plugin::upload.settings.read',
  create: 'plugin::upload.assets.create',
  update: 'plugin::upload.assets.update',
  download: 'plugin::upload.assets.download',
  copyLink: 'plugin::upload.assets.copy-link',
};

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

  async updateSettings(ctx) {
    const {
      request: { body },
      state: { userAbility },
    } = ctx;

    if (userAbility.cannot(ACTIONS.readSettings, fileModel)) {
      return ctx.forbidden();
    }

    const data = await validateSettings(body);

    await getService('upload').setSettings(data);

    ctx.body = { data };
  },

  async getSettings(ctx) {
    const {
      state: { userAbility },
    } = ctx;

    if (userAbility.cannot(ACTIONS.readSettings, fileModel)) {
      return ctx.forbidden();
    }

    const data = await getService('upload').getSettings();

    ctx.body = { data };
  },

  async updateFileInfo(ctx) {
    const {
      state: { userAbility, user },
      query: { id },
      request: { body },
    } = ctx;

    const uploadService = getService('upload');
    const { pm } = await findEntityAndCheckPermissions(userAbility, ACTIONS.update, fileModel, id);

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
    const { pm } = await findEntityAndCheckPermissions(userAbility, ACTIONS.update, fileModel, id);

    if (Array.isArray(files)) {
      throw new ApplicationError('Cannot replace a file with multiple ones');
    }

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
      model: fileModel,
    });

    if (!pm.isAllowed) {
      return ctx.forbidden();
    }

    const data = await validateUploadBody(body);
    const uploadedFiles = await uploadService.upload({ data, files }, { user });

    ctx.body = await pm.sanitizeOutput(uploadedFiles, { action: ACTIONS.read });
  },

  async upload(ctx) {
    const {
      query: { id },
      request: { files: { files } = {} },
    } = ctx;

    if (id && (_.isEmpty(files) || files.size === 0)) {
      return this.updateFileInfo(ctx);
    }

    if (_.isEmpty(files) || files.size === 0) {
      throw new ApplicationError('Files are empty');
    }

    await (id ? this.replaceFile : this.uploadFiles)(ctx);
  },
};

const findEntityAndCheckPermissions = async (ability, action, model, id) => {
  const file = await getService('upload').findOne(id, [CREATED_BY_ATTRIBUTE]);

  if (_.isNil(file)) {
    throw new NotFoundError();
  }

  const pm = strapi.admin.services.permission.createPermissionsManager({ ability, action, model });

  const creatorId = _.get(file, [CREATED_BY_ATTRIBUTE, 'id']);
  const author = creatorId ? await strapi.admin.services.user.findOne(creatorId, ['roles']) : null;

  const fileWithRoles = _.set(_.cloneDeep(file), 'createdBy', author);

  if (pm.ability.cannot(pm.action, pm.toSubject(fileWithRoles))) {
    throw new ForbiddenError();
  }

  return { pm, file };
};
