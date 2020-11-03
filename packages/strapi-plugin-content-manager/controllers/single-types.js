'use strict';

const { pipe } = require('lodash/fp');
const {
  getService,
  wrapBadRequest,
  setCreatorFields,
  pickWritableAttributes,
} = require('../utils');

const findEntity = async model => {
  const entityManager = getService('entity-manager');

  const entity = await entityManager.find({}, model);
  return entityManager.assocCreatorRoles(entity);
};

module.exports = {
  async find(ctx) {
    const { userAbility } = ctx.state;
    const { model } = ctx.params;

    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.read()) {
      return ctx.forbidden();
    }

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
    const { body } = ctx.request;

    const entityManager = getService('entity-manager');
    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.create() && permissionChecker.cannot.update()) {
      return ctx.forbidden();
    }

    const entity = await findEntity(model);

    const pickWritables = pickWritableAttributes({ model });

    const pickPermittedFields = entity
      ? data => permissionChecker.sanitizeInput.update(data, entity)
      : permissionChecker.sanitizeInput.create;

    const setCreator = entity
      ? setCreatorFields({ user, isEdition: true })
      : setCreatorFields({ user });

    const sanitizeFn = pipe([pickWritables, pickPermittedFields, setCreator]);

    await wrapBadRequest(async () => {
      if (!entity) {
        const newEntity = await entityManager.create(sanitizeFn(body), model);
        ctx.body = permissionChecker.sanitizeOutput(newEntity);

        await strapi.telemetry.send('didCreateFirstContentTypeEntry', { model });
        return;
      }

      if (permissionChecker.cannot.update(entity)) {
        return ctx.forbidden();
      }

      const updatedEntity = await entityManager.update(entity, sanitizeFn(body), model);
      ctx.body = permissionChecker.sanitizeOutput(updatedEntity);
    })();
  },

  async delete(ctx) {
    const { userAbility } = ctx.state;
    const { model } = ctx.params;

    const entityManager = getService('entity-manager');
    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.delete()) {
      return ctx.forbidden();
    }

    const entity = await findEntity(model);

    if (!entity) {
      return ctx.notFound();
    }

    if (permissionChecker.cannot.delete(entity)) {
      return ctx.forbidden();
    }

    const deletedEntity = await entityManager.delete(entity, model);

    ctx.body = permissionChecker.sanitizeOutput(deletedEntity);
  },

  async publish(ctx) {
    const { userAbility } = ctx.state;
    const { model } = ctx.params;

    const entityManager = getService('entity-manager');
    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.publish()) {
      return ctx.forbidden();
    }

    const entity = await findEntity(model);

    if (!entity) {
      return ctx.notFound();
    }

    if (permissionChecker.cannot.publish(entity)) {
      return ctx.forbidden();
    }

    const publishedEntity = await entityManager.publish(entity, model);

    ctx.body = permissionChecker.sanitizeOutput(publishedEntity);
  },

  async unpublish(ctx) {
    const { userAbility } = ctx.state;
    const { model } = ctx.params;

    const entityManager = getService('entity-manager');
    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.unpublish()) {
      return ctx.forbidden();
    }

    const entity = await findEntity(model);

    if (!entity) {
      return ctx.notFound();
    }

    if (permissionChecker.cannot.unpublish(entity)) {
      return ctx.forbidden();
    }

    const unpublishedEntity = await entityManager.unpublish(entity, model);

    ctx.body = permissionChecker.sanitizeOutput(unpublishedEntity);
  },
};
