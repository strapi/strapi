import { setCreatorFields, pipeAsync } from '@strapi/utils';
import { getService } from '../utils';
import { validateBulkActionInput } from './validation';
import { getProhibitedCloningFields, excludeNotCreatableFields } from './utils/clone';

export default {
  async find(ctx: any) {
    const { userAbility } = ctx.state;
    const { model } = ctx.params;
    const { query } = ctx.request;

    const entityManager = getService('entity-manager');
    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.read()) {
      return ctx.forbidden();
    }

    const permissionQuery = await permissionChecker.sanitizedQuery.read(query);

    // @ts-expect-error populate builder needs to be called with a UID
    const populate = await getService('populate-builder')(model)
      .populateFromQuery(permissionQuery)
      .populateDeep(1)
      .countRelations({ toOne: false, toMany: true })
      .build();

    const { results, pagination } = await entityManager.findPage(
      { ...permissionQuery, populate },
      model
    );

    const sanitizedResults = await Promise.all(
      results.map((result: any) => permissionChecker.sanitizeOutput(result))
    );

    ctx.body = {
      results: sanitizedResults,
      pagination,
    };
  },

  async findOne(ctx: any) {
    const { userAbility } = ctx.state;
    const { model, id } = ctx.params;

    const entityManager = getService('entity-manager');
    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.read()) {
      return ctx.forbidden();
    }

    const permissionQuery = await permissionChecker.sanitizedQuery.read(ctx.query);
    // @ts-expect-error populate builder needs to be called with a UID
    const populate = await getService('populate-builder')(model)
      .populateFromQuery(permissionQuery)
      .populateDeep(Infinity)
      .countRelations()
      .build();

    const entity = await entityManager.findOne(id, model, { populate });

    if (!entity) {
      return ctx.notFound();
    }

    // if the user has condition that needs populated content, it's not applied because entity don't have relations populated
    if (permissionChecker.cannot.read(entity)) {
      return ctx.forbidden();
    }

    // TODO: Count populated relations by permissions

    ctx.body = await permissionChecker.sanitizeOutput(entity);
  },

  async create(ctx: any) {
    const { userAbility, user } = ctx.state;
    const { model } = ctx.params;
    const { body } = ctx.request;

    const totalEntries = await strapi.query(model).count();

    const entityManager = getService('entity-manager');
    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.create()) {
      return ctx.forbidden();
    }

    const pickPermittedFields = permissionChecker.sanitizeCreateInput;
    const setCreator = setCreatorFields({ user });

    const sanitizeFn = pipeAsync(pickPermittedFields, setCreator as any);

    const sanitizedBody = await sanitizeFn(body);

    const entity = await entityManager.create(sanitizedBody, model);

    // TODO: Revert the creation if create permission conditions are not met
    // if (permissionChecker.cannot.create(entity)) {
    //   return ctx.forbidden();
    // }

    ctx.body = await permissionChecker.sanitizeOutput(entity);

    if (totalEntries === 0) {
      strapi.telemetry.send('didCreateFirstContentTypeEntry', {
        eventProperties: { model },
      });
    }
  },

  async update(ctx: any) {
    const { userAbility, user } = ctx.state;
    const { id, model } = ctx.params;
    const { body } = ctx.request;

    const entityManager = getService('entity-manager');
    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.update()) {
      return ctx.forbidden();
    }

    const permissionQuery = await permissionChecker.sanitizedQuery.update(ctx.query);
    // @ts-expect-error populate builder needs to be called with a UID
    const populate = await getService('populate-builder')(model)
      .populateFromQuery(permissionQuery)
      .build();

    const entity = await entityManager.findOne(id, model, { populate });

    if (!entity) {
      return ctx.notFound();
    }

    if (permissionChecker.cannot.update(entity)) {
      return ctx.forbidden();
    }

    const pickPermittedFields = permissionChecker.sanitizeUpdateInput(entity);
    const setCreator = setCreatorFields({ user, isEdition: true });
    const sanitizeFn = pipeAsync(pickPermittedFields, setCreator as any);
    const sanitizedBody = await sanitizeFn(body);

    const updatedEntity = await entityManager.update(entity, sanitizedBody, model);

    ctx.body = await permissionChecker.sanitizeOutput(updatedEntity);
  },

  async clone(ctx: any) {
    const { userAbility, user } = ctx.state;
    const { model, sourceId: id } = ctx.params;
    const { body } = ctx.request;

    const entityManager = getService('entity-manager');
    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.create()) {
      return ctx.forbidden();
    }

    const permissionQuery = await permissionChecker.sanitizedQuery.create(ctx.query);
    // @ts-expect-error populate builder needs to be called with a UID
    const populate = await getService('populate-builder')(model)
      .populateFromQuery(permissionQuery)
      .build();

    const entity = await entityManager.findOne(id, model, { populate });

    if (!entity) {
      return ctx.notFound();
    }

    const pickPermittedFields = permissionChecker.sanitizeCreateInput;
    const setCreator = setCreatorFields({ user });
    const excludeNotCreatable = excludeNotCreatableFields(model, permissionChecker);

    const sanitizeFn = pipeAsync(pickPermittedFields, setCreator as any, excludeNotCreatable);

    const sanitizedBody = await sanitizeFn(body);

    const clonedEntity = await entityManager.clone(entity, sanitizedBody, model);

    ctx.body = await permissionChecker.sanitizeOutput(clonedEntity);
  },

  async autoClone(ctx: any) {
    const { model } = ctx.params;

    // Check if the model has fields that prevent auto cloning
    const prohibitedFields = getProhibitedCloningFields(model);

    if (prohibitedFields.length > 0) {
      return ctx.badRequest(
        'Entity could not be cloned as it has unique and/or relational fields. ' +
          'Please edit those fields manually and save to complete the cloning.',
        {
          prohibitedFields,
        }
      );
    }

    await this.clone(ctx);
  },

  async delete(ctx: any) {
    const { userAbility } = ctx.state;
    const { id, model } = ctx.params;

    const entityManager = getService('entity-manager');
    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.delete()) {
      return ctx.forbidden();
    }

    const permissionQuery = await permissionChecker.sanitizedQuery.delete(ctx.query);
    // @ts-expect-error populate builder needs to be called with a UID
    const populate = await getService('populate-builder')(model)
      .populateFromQuery(permissionQuery)
      .build();

    const entity = await entityManager.findOne(id, model, { populate });

    if (!entity) {
      return ctx.notFound();
    }

    if (permissionChecker.cannot.delete(entity)) {
      return ctx.forbidden();
    }

    const result = await entityManager.delete(entity, model);

    ctx.body = await permissionChecker.sanitizeOutput(result);
  },

  async publish(ctx: any) {
    const { userAbility, user } = ctx.state;
    const { id, model } = ctx.params;

    const entityManager = getService('entity-manager');
    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.publish()) {
      return ctx.forbidden();
    }

    const permissionQuery = await permissionChecker.sanitizedQuery.publish(ctx.query);
    // @ts-expect-error populate builder needs to be called with a UID
    const populate = await getService('populate-builder')(model)
      .populateFromQuery(permissionQuery)
      .populateDeep(Infinity)
      .countRelations()
      .build();

    const entity = await entityManager.findOne(id, model, { populate });

    if (!entity) {
      return ctx.notFound();
    }

    if (permissionChecker.cannot.publish(entity)) {
      return ctx.forbidden();
    }

    const result = await entityManager.publish(
      entity,
      model,
      setCreatorFields({ user, isEdition: true })({})
    );

    ctx.body = await permissionChecker.sanitizeOutput(result);
  },

  async bulkPublish(ctx: any) {
    const { userAbility } = ctx.state;
    const { model } = ctx.params;
    const { body } = ctx.request;
    const { ids } = body;

    await validateBulkActionInput(body);

    const entityManager = getService('entity-manager');
    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.publish()) {
      return ctx.forbidden();
    }

    const permissionQuery = await permissionChecker.sanitizedQuery.publish(ctx.query);
    // @ts-expect-error populate builder needs to be called with a UID
    const populate = await getService('populate-builder')(model)
      .populateFromQuery(permissionQuery)
      .populateDeep(Infinity)
      .countRelations()
      .build();

    const entityPromises = ids.map((id: any) => entityManager.findOne(id, model, { populate }));
    const entities = await Promise.all(entityPromises);

    for (const entity of entities) {
      if (!entity) {
        return ctx.notFound();
      }

      if (permissionChecker.cannot.publish(entity)) {
        return ctx.forbidden();
      }
    }

    const { count } = await entityManager.publishMany(entities, model);
    ctx.body = { count };
  },

  async bulkUnpublish(ctx: any) {
    const { userAbility } = ctx.state;
    const { model } = ctx.params;
    const { body } = ctx.request;
    const { ids } = body;

    await validateBulkActionInput(body);

    const entityManager = getService('entity-manager');
    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.unpublish()) {
      return ctx.forbidden();
    }

    const permissionQuery = await permissionChecker.sanitizedQuery.publish(ctx.query);
    // @ts-expect-error populate builder needs to be called with a UID
    const populate = await getService('populate-builder')(model)
      .populateFromQuery(permissionQuery)
      .build();

    const entityPromises = ids.map((id: any) => entityManager.findOne(id, model, { populate }));
    const entities = await Promise.all(entityPromises);

    for (const entity of entities) {
      if (!entity) {
        return ctx.notFound();
      }

      if (permissionChecker.cannot.publish(entity)) {
        return ctx.forbidden();
      }
    }

    const { count } = await entityManager.unpublishMany(entities, model);
    ctx.body = { count };
  },

  async unpublish(ctx: any) {
    const { userAbility, user } = ctx.state;
    const { id, model } = ctx.params;

    const entityManager = getService('entity-manager');
    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.unpublish()) {
      return ctx.forbidden();
    }

    const permissionQuery = await permissionChecker.sanitizedQuery.unpublish(ctx.query);
    // @ts-expect-error populate builder needs to be called with a UID
    const populate = await getService('populate-builder')(model)
      .populateFromQuery(permissionQuery)
      .build();

    const entity = await entityManager.findOne(id, model, { populate });

    if (!entity) {
      return ctx.notFound();
    }

    if (permissionChecker.cannot.unpublish(entity)) {
      return ctx.forbidden();
    }

    const result = await entityManager.unpublish(
      entity,
      model,
      setCreatorFields({ user, isEdition: true })({})
    );

    ctx.body = await permissionChecker.sanitizeOutput(result);
  },

  async bulkDelete(ctx: any) {
    const { userAbility } = ctx.state;
    const { model } = ctx.params;
    const { query, body } = ctx.request;
    const { ids } = body;

    await validateBulkActionInput(body);

    const entityManager = getService('entity-manager');
    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.delete()) {
      return ctx.forbidden();
    }

    // TODO: fix
    const permissionQuery = await permissionChecker.sanitizedQuery.delete(query);

    const idsWhereClause = { id: { $in: ids } };
    const params = {
      ...permissionQuery,
      filters: {
        $and: [idsWhereClause].concat(permissionQuery.filters || []),
      },
    };

    const { count } = await entityManager.deleteMany(params, model);

    ctx.body = { count };
  },

  async countDraftRelations(ctx: any) {
    const { userAbility } = ctx.state;
    const { model, id } = ctx.params;

    const entityManager = getService('entity-manager');
    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.read()) {
      return ctx.forbidden();
    }

    const permissionQuery = await permissionChecker.sanitizedQuery.read(ctx.query);
    // @ts-expect-error populate builder needs to be called with a UID
    const populate = await getService('populate-builder')(model)
      .populateFromQuery(permissionQuery)
      .build();

    const entity = await entityManager.findOne(id, model, { populate });

    if (!entity) {
      return ctx.notFound();
    }

    if (permissionChecker.cannot.read(entity)) {
      return ctx.forbidden();
    }

    const number = await entityManager.countDraftRelations(id, model);

    return {
      data: number,
    };
  },

  async countManyEntriesDraftRelations(ctx: any) {
    const { userAbility } = ctx.state;
    const ids = ctx.request.query.ids;
    const locale = ctx.request.query.locale;
    const { model } = ctx.params;

    const entityManager = getService('entity-manager');
    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.read()) {
      return ctx.forbidden();
    }

    const entities = await entityManager.find({ ids, locale }, model);

    if (!entities) {
      return ctx.notFound();
    }

    const number = await entityManager.countManyEntriesDraftRelations(ids, model, locale);

    return {
      data: number,
    };
  },
};
