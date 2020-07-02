'use strict';

const _ = require('lodash');

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

    const pm = strapi.admin.services.permission.createPermissionsManager(
      userAbility,
      ACTIONS.read,
      fileModel
    );

    if (!pm.isAllowed) {
      return ctx.forbidden();
    }

    const data = await strapi.plugins['upload'].services.upload.fetch({
      _where: [pm.query, { id }],
    });

    if (!data) {
      return ctx.notFound('file.notFound');
    }

    ctx.body = pm.sanitize(data);
  },

  async count(ctx) {
    const pm = strapi.admin.services.permission.createPermissionsManager(
      ctx.state.userAbility,
      ACTIONS.read,
      fileModel
    );

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

    const pm = strapi.admin.services.permission.createPermissionsManager(
      userAbility,
      ACTIONS.update,
      fileModel
    );

    const file = await strapi.plugins['upload'].services.upload.fetch({ id });

    if (!file) {
      return ctx.notFound('file.notFound');
    }

    if (pm.ability.cannot(ACTIONS.update, pm.toSubject(file))) {
      return ctx.forbidden();
    }

    await strapi.plugins['upload'].services.upload.remove(file);

    ctx.body = pm.sanitize(file, { action: ACTIONS.read });
  },
};
