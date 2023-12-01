import { setCreatorFields, pipeAsync } from '@strapi/utils';

import { getService } from '../utils';

const findEntity = async (query: any, model: any) => {
  const entityManager = getService('entity-manager');

  // @ts-expect-error populate builder needs to be called with a UID
  const populate = await getService('populate-builder')(model)
    .populateFromQuery(query)
    .populateDeep(Infinity)
    .countRelations()
    .build();

  return entityManager.find(query, model, { populate });
};

export default {
  async find(ctx: any) {
    const { userAbility } = ctx.state;
    const { model } = ctx.params;
    const { query = {} } = ctx.request;

    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.read()) {
      return ctx.forbidden();
    }

    const permissionQuery = await permissionChecker.sanitizedQuery.read(query);

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

    ctx.body = await permissionChecker.sanitizeOutput(entity);
  },

  async createOrUpdate(ctx: any) {
    const { user, userAbility } = ctx.state;
    const { model } = ctx.params;
    const { body, query } = ctx.request;

    const entityManager = getService('entity-manager');
    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.create() && permissionChecker.cannot.update()) {
      return ctx.forbidden();
    }

    const sanitizedQuery = await permissionChecker.sanitizedQuery.update(query);
    const entity = await findEntity(sanitizedQuery, model);

    const pickPermittedFields = entity
      ? permissionChecker.sanitizeUpdateInput(entity)
      : permissionChecker.sanitizeCreateInput;

    const setCreator = entity
      ? setCreatorFields({ user, isEdition: true })
      : setCreatorFields({ user });

    const sanitizeFn = pipeAsync(pickPermittedFields, setCreator as any);

    if (!entity) {
      const sanitizedBody = await sanitizeFn(body);
      const newEntity = await entityManager.create(sanitizedBody, model, {
        params: sanitizedQuery,
      });
      ctx.body = await permissionChecker.sanitizeOutput(newEntity);

      await strapi.telemetry.send('didCreateFirstContentTypeEntry', {
        eventProperties: { model },
      });
      return;
    }

    if (permissionChecker.cannot.update(entity)) {
      return ctx.forbidden();
    }

    const sanitizedBody = await sanitizeFn(body);
    const updatedEntity = await entityManager.update(entity, sanitizedBody, model);
    ctx.body = await permissionChecker.sanitizeOutput(updatedEntity);
  },

  async delete(ctx: any) {
    const { userAbility } = ctx.state;
    const { model } = ctx.params;
    const { query = {} } = ctx.request;

    const entityManager = getService('entity-manager');
    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.delete()) {
      return ctx.forbidden();
    }

    const sanitizedQuery = await permissionChecker.sanitizedQuery.delete(query);

    const entity = await findEntity(sanitizedQuery, model);

    if (!entity) {
      return ctx.notFound();
    }

    if (permissionChecker.cannot.delete(entity)) {
      return ctx.forbidden();
    }

    const deletedEntity = await entityManager.delete(entity, model);

    ctx.body = await permissionChecker.sanitizeOutput(deletedEntity);
  },

  async publish(ctx: any) {
    const { userAbility, user } = ctx.state;
    const { model } = ctx.params;
    const { query = {} } = ctx.request;

    const entityManager = getService('entity-manager');
    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.publish()) {
      return ctx.forbidden();
    }

    const sanitizedQuery = await permissionChecker.sanitizedQuery.publish(query);

    const entity = await findEntity(sanitizedQuery, model);

    if (!entity) {
      return ctx.notFound();
    }

    if (permissionChecker.cannot.publish(entity)) {
      return ctx.forbidden();
    }

    const publishedEntity = await entityManager.publish(
      entity,
      model,
      setCreatorFields({ user, isEdition: true })({})
    );

    ctx.body = await permissionChecker.sanitizeOutput(publishedEntity);
  },

  async unpublish(ctx: any) {
    const { userAbility, user } = ctx.state;
    const { model } = ctx.params;
    const { query = {} } = ctx.request;

    const entityManager = getService('entity-manager');
    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.unpublish()) {
      return ctx.forbidden();
    }

    const sanitizedQuery = await permissionChecker.sanitizedQuery.unpublish(query);

    const entity = await findEntity(sanitizedQuery, model);

    if (!entity) {
      return ctx.notFound();
    }

    if (permissionChecker.cannot.unpublish(entity)) {
      return ctx.forbidden();
    }

    const unpublishedEntity = await entityManager.unpublish(
      entity,
      model,
      setCreatorFields({ user, isEdition: true })({})
    );

    ctx.body = await permissionChecker.sanitizeOutput(unpublishedEntity);
  },

  async countDraftRelations(ctx: any) {
    const { userAbility } = ctx.state;
    const { model } = ctx.params;

    const entityManager = getService('entity-manager');
    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.read()) {
      return ctx.forbidden();
    }

    const entity = await findEntity({}, model);
    if (!entity) {
      return ctx.notFound();
    }

    if (permissionChecker.cannot.read(entity)) {
      return ctx.forbidden();
    }

    const number = await entityManager.countDraftRelations(entity.id, model);

    return {
      data: number,
    };
  },
};
