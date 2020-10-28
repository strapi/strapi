'use strict';

const { prop, pipe, assoc, assign } = require('lodash/fp');
const { contentTypes: contentTypesUtils } = require('strapi-utils');
const { getService } = require('../utils');
const parseBody = require('../utils/parse-body');
const { ACTIONS } = require('./constants');

const {
  CREATED_BY_ATTRIBUTE,
  UPDATED_BY_ATTRIBUTE,
  PUBLISHED_AT_ATTRIBUTE,
} = contentTypesUtils.constants;

const pickPermittedFields = ({ pm, action, model }) => data => {
  return pm.pickPermittedFieldsOf(data, { action, subject: model });
};

const setCreatorFields = ({ user, isEdition = false }) => data => {
  if (isEdition) {
    return assoc(UPDATED_BY_ATTRIBUTE, user.id, data);
  }

  return assign(data, {
    [CREATED_BY_ATTRIBUTE]: user.id,
    [UPDATED_BY_ATTRIBUTE]: user.id,
  });
};

module.exports = {
  async find(ctx) {
    const { userAbility } = ctx.state;
    const { model } = ctx.params;

    const pm = strapi.admin.services.permission.createPermissionsManager(
      userAbility,
      ACTIONS.read,
      model
    );

    const singleTypeService = getService('single-types');

    const entity = await singleTypeService.fetchEntitiyWithCreatorRoles(model);

    // allow user with create permission to know a single type is not created
    if (!entity) {
      if (pm.ability.cannot(ACTIONS.create, model)) {
        return ctx.forbidden();
      }

      return ctx.notFound();
    }

    if (pm.ability.cannot(ACTIONS.read, pm.toSubject(entity))) {
      return ctx.forbidden();
    }

    ctx.body = pm.sanitize(entity, { action: ACTIONS.read });
  },

  async createOrUpdate(ctx) {
    const { user, userAbility } = ctx.state;
    const { model } = ctx.params;

    const { data, files } = parseBody(ctx);

    const singleTypeService = getService('single-types');
    const existingEntity = await singleTypeService.fetchEntitiyWithCreatorRoles(model);

    try {
      if (!existingEntity) {
        const pm = strapi.admin.services.permission.createPermissionsManager(
          userAbility,
          ACTIONS.create,
          model
        );

        const sanitizedData = pipe([
          pickPermittedFields({ pm, action: ACTIONS.create, model }),
          setCreatorFields({ user }),
        ])(data);

        const entity = await singleTypeService.create({ data: sanitizedData, files }, { model });

        ctx.body = pm.sanitize(entity, { action: ACTIONS.read });
        return;
      }

      const pm = strapi.admin.services.permission.createPermissionsManager(
        userAbility,
        ACTIONS.edit,
        model
      );

      if (pm.ability.cannot(ACTIONS.edit, pm.toSubject(existingEntity))) {
        return strapi.errors.forbidden();
      }

      const sanitizedData = pipe([
        pickPermittedFields({ pm, action: ACTIONS.edit, model: pm.toSubject(existingEntity) }),
        setCreatorFields({ user, isEdition: true }),
      ])(data);

      const entity = await singleTypeService.update(
        existingEntity,
        { data: sanitizedData, files },
        { model }
      );

      ctx.body = pm.sanitize(entity, { action: ACTIONS.read });
    } catch (error) {
      strapi.log.error(error);
      ctx.badRequest(null, [
        {
          messages: [{ id: error.message, message: error.message, field: error.field }],
          errors: prop('data.errors', error),
        },
      ]);
    }
  },

  async delete(ctx) {
    const { userAbility } = ctx.state;
    const { model } = ctx.params;

    const singleTypeService = getService('single-types');

    const existingEntity = await singleTypeService.fetchEntitiyWithCreatorRoles(model);

    const pm = strapi.admin.services.permission.createPermissionsManager(
      userAbility,
      ACTIONS.delete,
      model
    );

    if (pm.ability.cannot(ACTIONS.delete, pm.toSubject(existingEntity))) {
      return strapi.errors.forbidden();
    }

    const deletedEntity = await singleTypeService.delete(existingEntity, { userAbility, model });

    ctx.body = pm.sanitize(deletedEntity, { action: ACTIONS.read });
  },

  async publish(ctx) {
    const { userAbility } = ctx.state;
    const { model } = ctx.params;

    const singleTypeService = getService('single-types');

    const existingEntity = await singleTypeService.fetchEntitiyWithCreatorRoles(model);

    if (!existingEntity) {
      return ctx.notFound();
    }

    const pm = strapi.admin.services.permission.createPermissionsManager(
      userAbility,
      ACTIONS.publish,
      model
    );

    if (pm.ability.cannot(ACTIONS.publish, pm.toSubject(existingEntity))) {
      return ctx.forbidden();
    }

    await strapi.entityValidator.validateEntityCreation(strapi.getModel(model), existingEntity);

    if (existingEntity[PUBLISHED_AT_ATTRIBUTE]) {
      return ctx.badRequest('Already published');
    }

    const publishedEntry = await getService('contentmanager').publish(
      { id: existingEntity.id },
      model
    );

    ctx.body = pm.sanitize(publishedEntry, { action: ACTIONS.read });
  },

  async unpublish(ctx) {
    const { userAbility } = ctx.state;
    const { model } = ctx.params;

    const singleTypeService = getService('single-types');

    const existingEntity = await singleTypeService.fetchEntitiyWithCreatorRoles(model);

    if (!existingEntity) {
      return ctx.notFound();
    }

    const pm = strapi.admin.services.permission.createPermissionsManager(
      userAbility,
      ACTIONS.publish,
      model
    );

    if (pm.ability.cannot(ACTIONS.publish, pm.toSubject(existingEntity))) {
      return ctx.forbidden();
    }

    if (!existingEntity[PUBLISHED_AT_ATTRIBUTE]) {
      return ctx.badRequest('Already a draft');
    }

    const unpublishedEntry = await getService('contentmanager').unpublish(
      { id: existingEntity.id },
      model
    );

    ctx.body = pm.sanitize(unpublishedEntry, { action: ACTIONS.read });
  },
};
