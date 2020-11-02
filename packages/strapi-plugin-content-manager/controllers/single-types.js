'use strict';

const { pipe } = require('lodash/fp');
const {
  getService,
  wrapBadRequest,
  parseBody,
  setCreatorFields,
  pickWritableAttributes,
} = require('../utils');

const findEntity = async model => {
  const service = getService('entity');

  const entity = service.find({}, model);
  return service.assocCreatorRoles(entity);
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

    const { data, files } = parseBody(ctx);

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
    })();
  },

  async delete(ctx) {
    const { userAbility } = ctx.state;
    const { model } = ctx.params;

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

    const deletedEntity = await getService('entity').delete(entity, model);

    ctx.body = permissionChecker.sanitizeOutput(deletedEntity);
  },

  async publish(ctx) {
    const { userAbility } = ctx.state;
    const { model } = ctx.params;

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

    const publishedEntity = await getService('entity').publish(entity, model);

    ctx.body = permissionChecker.sanitizeOutput(publishedEntity);
  },

  async unpublish(ctx) {
    const { userAbility } = ctx.state;
    const { model } = ctx.params;

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

    const unpublishedEntity = await getService('entity').unpublish(entity, model);

    ctx.body = permissionChecker.sanitizeOutput(unpublishedEntity);
  },
};
