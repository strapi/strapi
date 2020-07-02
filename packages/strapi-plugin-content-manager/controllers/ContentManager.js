'use strict';

const _ = require('lodash');

const parseMultipartBody = require('../utils/parse-multipart');
const {
  validateGenerateUIDInput,
  validateCheckUIDAvailabilityInput,
  validateUIDField,
} = require('./validation');

const ACTIONS = {
  read: 'plugins::content-manager.explorer.read',
  create: 'plugins::content-manager.explorer.create',
  edit: 'plugins::content-manager.explorer.update',
  delete: 'plugins::content-manager.explorer.delete',
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
      request,
    } = ctx;
    const contentManagerService = strapi.plugins['content-manager'].services.contentmanager;
    const pm = strapi.admin.services.permission.createPermissionsManager(
      userAbility,
      ACTIONS.read,
      model
    );

    const method = _.has(request.query, '_q') ? 'search' : 'fetchAll';
    const query = pm.queryFrom(request.query);

    const results = await contentManagerService[method](model, query);

    if (!results) {
      return ctx.notFound();
    }

    ctx.body = pm.sanitize(results);
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

    const entry = await contentManagerService.fetch(model, id, { query: pm.query });

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
    const {
      state: { userAbility },
      params: { model },
      request,
    } = ctx;
    const contentManagerService = strapi.plugins['content-manager'].services.contentmanager;

    const pm = strapi.admin.services.permission.createPermissionsManager(
      userAbility,
      ACTIONS.read,
      model
    );
    const method = _.has(request.query, '_q') ? 'countSearch' : 'count';
    const query = pm.queryFrom(request.query);

    const count = await contentManagerService[method](model, query);

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

    const sanitize = e => pm.pickPermittedFieldsOf(e, { subject: model });

    const { data, files } = ctx.is('multipart') ? parseMultipartBody(ctx) : { data: body };

    try {
      const result = await contentManagerService.create(
        {
          data: { ...sanitize(data), created_by: user.id, updated_by: user.id },
          files,
        },
        { model }
      );

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

    const sanitize = e => pm.pickPermittedFieldsOf(e, { subject: pm.toSubject(entity) });

    const { data, files } = ctx.is('multipart') ? parseMultipartBody(ctx) : { data: body };

    try {
      const result = await contentManagerService.edit(
        { id },
        { data: { ...sanitize(data), updated_by: user.id }, files },
        { model }
      );

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
      state: { userAbility },
      params: { model },
      request,
    } = ctx;
    const contentManagerService = strapi.plugins['content-manager'].services.contentmanager;
    const pm = strapi.admin.services.permission.createPermissionsManager(
      userAbility,
      ACTIONS.delete,
      model
    );

    const results = await contentManagerService.deleteMany(
      model,
      Object.values(request.query),
      pm.query
    );

    ctx.body = results.map(result => pm.sanitize(result, { action: ACTIONS.read }));
  },

  async findRelationList(ctx) {
    const { model, targetField } = ctx.params;
    const { query } = ctx.request;

    if (!targetField) {
      return ctx.badRequest();
    }

    const modelDef = strapi.db.getModel(model);

    if (!model) {
      return ctx.notFound('model.notFound');
    }

    const attr = modelDef.attributes[targetField];
    if (!attr) {
      return ctx.badRequest('targetField.invalid');
    }

    const target = strapi.db.getModelByAssoc(attr);

    const contentManagerService = strapi.plugins['content-manager'].services.contentmanager;

    let entities = [];

    if (_.has(ctx.request.query, '_q')) {
      entities = await contentManagerService.search(target.uid, query);
    } else {
      entities = await contentManagerService.fetchAll(target.uid, query);
    }

    if (!entities) {
      return ctx.notFound();
    }

    const modelConfig = await strapi.plugins[
      'content-manager'
    ].services.contenttypes.getConfiguration(model);

    const field = _.get(modelConfig, `metadatas.${targetField}.edit.mainField`, 'id');
    const pickFields = [field, 'id', target.primaryKey];
    const sanitize = d => _.pick(d, pickFields);

    ctx.body = _.isArray(entities) ? entities.map(sanitize) : sanitize(entities);
  },
};
