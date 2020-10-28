'use strict';

const { omit, pipe, assoc, assign } = require('lodash/fp');
const { contentTypes: contentTypesUtils } = require('strapi-utils');
const { getService } = require('../utils');
const parseBody = require('../utils/parse-body');

const {
  CREATED_BY_ATTRIBUTE,
  UPDATED_BY_ATTRIBUTE,
  PUBLISHED_AT_ATTRIBUTE,
} = contentTypesUtils.constants;

const pickWritableFields = ({ model }) => {
  return omit(contentTypesUtils.getNonWritableAttributes(strapi.getModel(model)));
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

const findEntity = async model => {
  const service = getService('entity');

  return service.find({}, model).then(entity => service.assocCreateRoles(entity));
};

module.exports = {
  async find(ctx) {
    const { userAbility } = ctx.state;
    const { model } = ctx.params;

    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    const entity = await findEntity(model);

    // allow user with create permission to know a single type is not created
    if (!entity) {
      if (permissionChecker.cannot.create()) {
        return ctx.forbidden();
      }

      return ctx.notFound();
    }

    if (permissionChecker.cannot.read(entity)) {
      return ctx.forbidden();
    }

    ctx.body = permissionChecker.sanitizeOutput(entity);
  },

  async createOrUpdate(ctx) {
    const { user, userAbility } = ctx.state;
    const { model } = ctx.params;

    const { data, files } = parseBody(ctx);

    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.create() && permissionChecker.cannot.update()) {
      return ctx.forbidden();
    }

    const entity = await findEntity(model);

    const pickWritables = pickWritableFields({ model });

    const pickPermittedFields = entity
      ? data => permissionChecker.sanitizeInput.update(data, entity)
      : permissionChecker.sanitizeInput.create;

    const setCreator = entity
      ? setCreatorFields({ user, isEdition: true })
      : setCreatorFields({ user });

    const sanitizeFn = pipe([pickWritables, pickPermittedFields, setCreator]);

    if (!entity) {
      const entity = await getService('entity').create({ data: sanitizeFn(data), files }, model);

      ctx.body = permissionChecker.sanitizeOutput(entity);

      await strapi.telemetry.send('didCreateFirstContentTypeEntry', { model });
      return;
    }

    if (permissionChecker.cannot.update(entity)) {
      return ctx.forbidden();
    }

    const updatedEntity = await getService('entity').update(
      entity,
      { data: sanitizeFn(data), files },
      model
    );

    ctx.body = permissionChecker.sanitizeOutput(updatedEntity);
  },

  async delete(ctx) {
    const { userAbility } = ctx.state;
    const { model } = ctx.params;

    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.delete()) {
      return ctx.forbidden();
    }

    const existingEntity = await findEntity(model);

    if (!existingEntity) {
      return ctx.notFound();
    }

    if (permissionChecker.cannot.delete(existingEntity)) {
      return ctx.forbidden();
    }

    const deletedEntity = await getService('entity').delete(existingEntity, model);

    ctx.body = permissionChecker.sanitizeOutput(deletedEntity);
  },

  async publish(ctx) {
    const { userAbility } = ctx.state;
    const { model } = ctx.params;

    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.publish()) {
      return ctx.forbidden();
    }

    const existingEntity = await findEntity(model);

    if (!existingEntity) {
      return ctx.notFound();
    }

    if (permissionChecker.cannot.publish(existingEntity)) {
      return ctx.forbidden();
    }

    // TODO: avoid doing it here and in the entity Service
    await strapi.entityValidator.validateEntityCreation(strapi.getModel(model), existingEntity);

    if (existingEntity[PUBLISHED_AT_ATTRIBUTE]) {
      return ctx.badRequest('already.published');
    }

    const publishedEntity = await getService('entity').publish(existingEntity, model);

    ctx.body = permissionChecker.sanitizeOutput(publishedEntity);
  },

  async unpublish(ctx) {
    const { userAbility } = ctx.state;
    const { model } = ctx.params;

    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.unpublish()) {
      return ctx.forbidden();
    }

    const existingEntity = await findEntity(model);

    if (!existingEntity) {
      return ctx.notFound();
    }

    if (permissionChecker.cannot.unpublish(existingEntity)) {
      return ctx.forbidden();
    }

    if (!existingEntity[PUBLISHED_AT_ATTRIBUTE]) {
      return ctx.badRequest('already.draft');
    }

    const unpublishedEntity = await getService('entity').unpublish(existingEntity, model);

    ctx.body = permissionChecker.sanitizeOutput(unpublishedEntity);
  },
};
