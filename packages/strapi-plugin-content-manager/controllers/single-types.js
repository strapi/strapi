'use strict';

const { pipe } = require('lodash/fp');
const { setCreatorFields } = require('strapi-utils');

const { getService, wrapBadRequest, pickWritableAttributes } = require('../utils');

const findEntity = async (query, model) => {
  const entityManager = getService('entity-manager');
  const entity = await entityManager.find(query, model);
  return entityManager.assocCreatorRoles(entity);
};

module.exports = {
  async find(ctx) {
    const { userAbility } = ctx.state;
    const { model } = ctx.params;
    const { query = {} } = ctx.request;

    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.read()) {
      return ctx.forbidden();
    }

    const permissionQuery = permissionChecker.buildReadQuery(query);

    const entity = await findEntity(permissionQuery, model);

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
    const { body, query } = ctx.request;

    const entityManager = getService('entity-manager');
    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.create() && permissionChecker.cannot.update()) {
      return ctx.forbidden();
    }

    const entity = await findEntity(query, model);

    const pickWritables = pickWritableAttributes({ model });

    const pickPermittedFields = entity
      ? permissionChecker.sanitizeUpdateInput(entity)
      : permissionChecker.sanitizeCreateInput;

    const setCreator = entity
      ? setCreatorFields({ user, isEdition: true })
      : setCreatorFields({ user });

    const sanitizeFn = pipe([pickWritables, pickPermittedFields, setCreator]);

    await wrapBadRequest(async () => {
      if (!entity) {
        const newEntity = await entityManager.create(sanitizeFn(body), model, { params: query });
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
    const { query = {} } = ctx.request;

    const entityManager = getService('entity-manager');
    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.delete()) {
      return ctx.forbidden();
    }

    const entity = await findEntity(query, model);

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
    const { query = {} } = ctx.request;

    const entityManager = getService('entity-manager');
    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.publish()) {
      return ctx.forbidden();
    }

    const entity = await findEntity(query, model);

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
    const { query = {} } = ctx.request;

    const entityManager = getService('entity-manager');
    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.unpublish()) {
      return ctx.forbidden();
    }

    const entity = await findEntity(query, model);

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
