'use strict';

const _ = require('lodash');
const validateSettings = require('../validation/settings');
const validateUploadBody = require('../validation/upload');

const ACTIONS = {
  read: 'plugins::upload.read',
  readSettings: 'plugins::upload.settings.read',
  create: 'plugins::upload.assets.create',
  update: 'plugins::upload.assets.update',
  download: 'plugins::upload.assets.download',
  copyLink: 'plugins::upload.assets.copy-link',
};

const fileModel = 'plugins::upload.file';

module.exports = {
  async find(ctx) {
    const {
      state: { userAbility },
    } = ctx;

    const pm = strapi.admin.services.permission.createPermissionsManager(
      userAbility,
      ACTIONS.read,
      fileModel
    );

    if (!pm.isAllowed) {
      return ctx.forbidden();
    }

    const method = _.has(ctx.query, '_q') ? 'search' : 'fetchAll';

    const query = pm.queryFrom(ctx.query);
    const result = await strapi.plugins.upload.services.upload[method](query);

    ctx.body = pm.sanitize(result);
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

    ctx.body = pm.sanitize(file);
  },

  async count(ctx) {
    const pm = strapi.admin.services.permission.createPermissionsManager(
      ctx.state.userAbility,
      ACTIONS.read,
      fileModel
    );

    if (!pm.isAllowed) {
      return ctx.forbidden();
    }

    const method = _.has(ctx.query, '_q') ? 'countSearch' : 'count';
    const query = pm.queryFrom(ctx.query);

    const count = await strapi.plugins.upload.services.upload[method](query);

    ctx.body = { count };
  },

  async destroy(ctx) {
    const {
      state: { userAbility },
      params: { id },
    } = ctx;

    const { pm, file } = await findEntityAndCheckPermissions(
      userAbility,
      ACTIONS.update,
      fileModel,
      id
    );

    await strapi.plugins['upload'].services.upload.remove(file);

    ctx.body = pm.sanitize(file, { action: ACTIONS.read });
  },

  async updateSettings(ctx) {
    const {
      request: { body },
      state: { userAbility },
    } = ctx;

    if (userAbility.cannot(ACTIONS.read, fileModel)) {
      return ctx.forbidden();
    }

    const data = await validateSettings(body);

    await strapi.plugins.upload.services.upload.setSettings(data);

    ctx.body = { data };
  },

  async getSettings(ctx) {
    const {
      state: { userAbility },
    } = ctx;

    if (userAbility.cannot(ACTIONS.readSettings, fileModel)) {
      return ctx.forbidden();
    }

    const data = await strapi.plugins.upload.services.upload.getSettings();

    ctx.body = { data };
  },

  async updateFileInfo(ctx) {
    const {
      state: { userAbility, user },
      query: { id },
      request: { body },
    } = ctx;

    const uploadService = strapi.plugins.upload.services.upload;
    const { pm } = await findEntityAndCheckPermissions(userAbility, ACTIONS.update, fileModel, id);

    const data = await validateUploadBody(body);
    const file = await uploadService.updateFileInfo(id, data.fileInfo);

    await uploadService.setCreatorInfo(user.id, file, { edition: true });

    ctx.body = pm.sanitize(file, { action: ACTIONS.read });
  },

  async replaceFile(ctx) {
    const {
      state: { userAbility, user },
      query: { id },
      request: { body, files: { files } = {} },
    } = ctx;

    const uploadService = strapi.plugins.upload.services.upload;
    const { pm } = await findEntityAndCheckPermissions(userAbility, ACTIONS.update, fileModel, id);

    if (Array.isArray(files)) {
      throw strapi.errors.badRequest(null, {
        errors: [
          { id: 'Upload.replace.single', message: 'Cannot replace a file with multiple ones' },
        ],
      });
    }

    const data = await validateUploadBody(body);
    const file = await uploadService.replace(id, { data, file: files });

    await uploadService.setCreatorInfo(user.id, file, { edition: true });

    ctx.body = pm.sanitize(file, { action: ACTIONS.read });
  },

  async uploadFiles(ctx) {
    const {
      state: { userAbility, user },
      request: { body, files: { files } = {} },
    } = ctx;

    const uploadService = strapi.plugins.upload.services.upload;
    const pm = strapi.admin.services.permission.createPermissionsManager(
      userAbility,
      ACTIONS.create,
      fileModel
    );

    if (!pm.isAllowed) {
      throw strapi.errors.forbidden();
    }

    const data = await validateUploadBody(body);
    const file = await uploadService.upload({ data, files });

    await uploadService.setCreatorInfo(user.id, file);

    ctx.body = pm.sanitize(file, { action: ACTIONS.read });
  },
};

const findEntityAndCheckPermissions = async (ability, action, model, id) => {
  const file = await strapi.plugins.upload.services.upload.fetch({ id });

  if (_.isNil(file)) {
    throw strapi.errors.notFound();
  }

  const pm = strapi.admin.services.permission.createPermissionsManager(ability, action, model);

  const roles = _.has(file, 'created_by.id')
    ? await strapi.query('role', 'admin').find({ users: file.created_by.id }, [])
    : [];
  const fileWithRoles = _.set(_.cloneDeep(file), 'created_by.roles', roles);

  if (pm.ability.cannot(pm.action, pm.toSubject(fileWithRoles))) {
    throw strapi.errors.forbidden();
  }

  return { pm, file };
};
