'use strict';

const _ = require('lodash');

const parseMultipartBody = require('../utils/parse-multipart');
const {
  validateGenerateUIDInput,
  validateCheckUIDAvailabilityInput,
  validateUIDField,
} = require('./validation');

const ACTIONS = {
  read: 'plugins::content-manager.read',
  create: 'plugins::content-manager.create',
  edit: 'plugins::content-manager.edit',
  delete: 'plugins::content-manager.delete',
};

const findEntityAndCheckPermissions = async (ability, action, model, id) => {
  const contentManagerService = strapi.plugins['content-manager'].services.contentmanager;
  const entity = await contentManagerService.fetch(model, id);

  if (_.isNil(entity)) {
    throw strapi.errors.notFound();
  }

  const pm = strapi.admin.services.permission.createPermissionsManager(ability, action, model);

  if (pm.ability.cannot(pm.action, pm.toSubject(entity))) {
    throw strapi.errors.forbidden();
  }

  return { pm, entity };
};

module.exports = {
  async generateUID(ctx) {
    const { contentTypeUID, field, data } = await validateGenerateUIDInput(ctx.request.body);

    await validateUIDField(contentTypeUID, field);

    const uidService = strapi.plugins['content-manager'].services.uid;

    ctx.body = {
      data: await uidService.generateUIDField({ contentTypeUID, field, data }),
    };
  },

  async checkUIDAvailability(ctx) {
    const { contentTypeUID, field, value } = await validateCheckUIDAvailabilityInput(
      ctx.request.body
    );

    await validateUIDField(contentTypeUID, field);

    const uidService = strapi.plugins['content-manager'].services.uid;

    const isAvailable = await uidService.checkUIDAvailability({ contentTypeUID, field, value });

    ctx.body = {
      isAvailable,
      suggestion: !isAvailable
        ? await uidService.findUniqueUID({ contentTypeUID, field, value })
        : null,
    };
  },

  /**
   * Returns a list of entities of a content-type matching the query parameters
   */
  async find(ctx) {
    const {
      state: { userAbility },
      params: { model },
    } = ctx;
    const contentManagerService = strapi.plugins['content-manager'].services.contentmanager;
    const pm = strapi.admin.services.permission.createPermissionsManager(
      userAbility,
      ACTIONS.read,
      model
    );

    let entities = [];
    if (_.has(ctx.request.query, '_q')) {
      entities = await contentManagerService.search(model, ctx.request.query, pm.query);
    } else {
      entities = await contentManagerService.fetchAll(model, ctx.request.query, pm.query);
    }

    if (!entities) {
      return ctx.notFound();
    }

    ctx.body = entities.map(entity => pm.sanitize(entity));
  },

  /**
   * Returns an entity of a content type by id
   */
  async findOne(ctx) {
    const {
      state: { userAbility },
      params: { model, id },
    } = ctx;
    const contentManagerService = strapi.plugins['content-manager'].services.contentmanager;
    const pm = strapi.admin.services.permission.createPermissionsManager(
      userAbility,
      ACTIONS.read,
      model
    );

    const entry = await contentManagerService.fetch(model, id, { params: pm.query });

    // Entry not found
    if (!entry) {
      return ctx.notFound('Entry not found');
    }

    ctx.body = pm.sanitize(entry);
  },

  /**
   * Returns a count of entities of a content type matching query parameters
   */
  async count(ctx) {
    const { model } = ctx.params;
    const contentManagerService = strapi.plugins['content-manager'].services.contentmanager;

    let count;
    if (_.has(ctx.request.query, '_q')) {
      count = await contentManagerService.countSearch({ model }, ctx.request.query);
    } else {
      count = await contentManagerService.count({ model }, ctx.request.query);
    }

    ctx.body = {
      count: _.isNumber(count) ? count : _.toNumber(count),
    };
  },

  /**
   * Creates an entity of a content type
   */
  async create(ctx) {
    const {
      state: { userAbility, user },
      params: { model },
      request: { body },
    } = ctx;
    const contentManagerService = strapi.plugins['content-manager'].services.contentmanager;

    const pm = strapi.admin.services.permission.createPermissionsManager(
      userAbility,
      ACTIONS.create,
      model
    );

    if (pm.ability.cannot(pm.action, pm.model)) {
      throw strapi.errors.forbidden();
    }

    const sanitize = e => pm.sanitize(e, { subject: ACTIONS.create });

    const userId = user.id;
    const { data, files } = ctx.is('multipart') ? parseMultipartBody(ctx) : { data: body };

    try {
      data.created_by = userId;
      data.updated_by = userId;

      const result = await contentManagerService.create({ data: sanitize(data), files }, { model });

      ctx.body = pm.sanitize(result, { action: ACTIONS.read });

      await strapi.telemetry.send('didCreateFirstContentTypeEntry', { model });
    } catch (error) {
      strapi.log.error(error);
      ctx.badRequest(null, [
        {
          messages: [{ id: error.message, message: error.message, field: error.field }],
          errors: _.get(error, 'data.errors'),
        },
      ]);
    }
  },

  /**
   * Updates an entity of a content type
   */
  async update(ctx) {
    const {
      state: { userAbility, user },
      params: { id, model },
      request: { body },
    } = ctx;

    const contentManagerService = strapi.plugins['content-manager'].services.contentmanager;

    const { pm, entity } = await findEntityAndCheckPermissions(
      userAbility,
      ACTIONS.edit,
      model,
      id
    );

    const sanitize = e => pm.sanitize(e, { subject: pm.toSubject(entity) });

    const userId = user.id;
    const { data, files } = ctx.is('multipart') ? parseMultipartBody(ctx) : { data: body };

    try {
      data.updated_by = userId;

      const result = await contentManagerService.edit({ id }, { data: sanitize(data), files }, { model });

      ctx.body = pm.sanitize(result, { action: ACTIONS.read });
    } catch (error) {
      strapi.log.error(error);
      ctx.badRequest(null, [
        {
          messages: [{ id: error.message, message: error.message, field: error.field }],
          errors: _.get(error, 'data.errors'),
        },
      ]);
    }
  },

  /**
   * Deletes one entity of a content type matching a query
   */
  async delete(ctx) {
    const {
      state: { userAbility },
      params: { id, model },
    } = ctx;
    const contentManagerService = strapi.plugins['content-manager'].services.contentmanager;

    const { pm } = await findEntityAndCheckPermissions(userAbility, ACTIONS.delete, model, id);

    const result = await contentManagerService.delete(model, id, pm.query);

    ctx.body = pm.sanitize(result, { action: ACTIONS.read });
  },

  /**
   * Deletes multiple entities of a content type matching a query
   */
  async deleteMany(ctx) {
    const {
      state: userAbility,
      params: { model },
    } = ctx;
    const contentManagerService = strapi.plugins['content-manager'].services.contentmanager;
    const pm = strapi.admin.services.permission.createPermissionsManager(
      userAbility,
      ACTIONS.delete,
      model
    );

    const results = await contentManagerService.deleteMany(model, ctx.request.query, pm.query);

    ctx.body = results.map(result => pm.sanitize(result, { action: ACTIONS.read }));
  },
};
