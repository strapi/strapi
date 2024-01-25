import { setCreatorFields, mapAsync, pipeAsync, errors } from '@strapi/utils';
import { getService } from '../utils';
import { validateBulkActionInput } from './validation';
import { hasProhibitedCloningFields, excludeNotCreatableFields } from './utils/clone';
import { getDocumentDimensions } from './utils/dimensions';

const { ApplicationError } = errors;

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

    const { locale, status } = getDocumentDimensions(query);

    const { results, pagination } = await entityManager.findPage(
      { ...permissionQuery, populate, locale, status },
      model
    );

    const sanitizedResults = await mapAsync(results, async (result: any) => {
      const sanitizedResult = await permissionChecker.sanitizeOutput(result);
      return sanitizedResult;
    });

    ctx.body = {
      results: sanitizedResults,
      pagination,
    };
  },

  async findOne(ctx: any) {
    const { userAbility } = ctx.state;
    const { model, id } = ctx.params;

    const entityManager = getService('entity-manager');
    const documentMetadata = getService('document-metadata');
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

    const { locale, status = 'draft' } = getDocumentDimensions(ctx.query);

    const document = await entityManager.findOne(id, model, {
      populate,
      locale,
      status,
    });

    if (!document) {
      return ctx.notFound();
    }

    // if the user has condition that needs populated content, it's not applied because entity don't have relations populated
    if (permissionChecker.cannot.read(document)) {
      return ctx.forbidden();
    }

    // TODO: Count populated relations by permissions
    const sanitizedDocument = await permissionChecker.sanitizeOutput(document);
    ctx.body = await documentMetadata.formatDocumentWithMetadata(model, sanitizedDocument);
  },

  async create(ctx: any) {
    const { userAbility, user } = ctx.state;
    const { model } = ctx.params;
    const { body } = ctx.request;

    const totalEntries = await strapi.query(model).count();

    const entityManager = getService('entity-manager');
    const documentMetadata = getService('document-metadata');
    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.create()) {
      return ctx.forbidden();
    }

    const pickPermittedFields = permissionChecker.sanitizeCreateInput;
    const setCreator = setCreatorFields({ user });
    const sanitizeFn = pipeAsync(pickPermittedFields, setCreator as any);
    const sanitizedBody = await sanitizeFn(body);

    const { locale, status = 'draft' } = getDocumentDimensions(body);
    const document = await entityManager.create(model, { data: sanitizedBody, locale, status });

    // TODO: Revert the creation if create permission conditions are not met
    // if (permissionChecker.cannot.create(entity)) {
    //   return ctx.forbidden();
    // }

    const sanitizedDocument = await permissionChecker.sanitizeOutput(document);
    ctx.body = await documentMetadata.formatDocumentWithMetadata(model, sanitizedDocument, {
      // Empty metadata as it's not relevant for a new document
      availableLocales: false,
      availableStatus: false,
    });

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
    const documentMetadata = getService('document-metadata');
    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.update()) {
      return ctx.forbidden();
    }

    // Populate necessary fields to check permissions
    const permissionQuery = await permissionChecker.sanitizedQuery.update(ctx.query);
    // @ts-expect-error populate builder needs to be called with a UID
    const populate = await getService('populate-builder')(model)
      .populateFromQuery(permissionQuery)
      .build();

    const { locale } = getDocumentDimensions(body);

    // Load document version to update
    const [documentVersion, documentExists] = await Promise.all([
      entityManager.findOne(id, model, {
        populate,
        locale,
        status: 'draft',
      }),
      entityManager.exists(model, id),
    ]);

    if (!documentExists) {
      return ctx.notFound();
    }

    // If version is not found, but document exists,
    // the intent is to create a new document locale
    if (documentVersion) {
      if (permissionChecker.cannot.update(documentVersion)) {
        return ctx.forbidden();
      }
    } else if (permissionChecker.cannot.create()) {
      return ctx.forbidden();
    }

    const pickPermittedFields = documentVersion
      ? permissionChecker.sanitizeUpdateInput(documentVersion)
      : permissionChecker.sanitizeCreateInput;
    const setCreator = setCreatorFields({ user, isEdition: true });
    const sanitizeFn = pipeAsync(pickPermittedFields, setCreator as any);
    const sanitizedBody = await sanitizeFn(body);

    const updatedVersion = await entityManager.update(documentVersion || { id }, model, {
      data: sanitizedBody,
      locale,
    });

    const sanitizedVersion = await permissionChecker.sanitizeOutput(updatedVersion);
    ctx.body = await documentMetadata.formatDocumentWithMetadata(model, sanitizedVersion);
  },

  async clone(ctx: any) {
    const { userAbility, user } = ctx.state;
    const { model, sourceId: id } = ctx.params;
    const { body } = ctx.request;

    const entityManager = getService('entity-manager');
    const documentMetadata = getService('document-metadata');
    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.create()) {
      return ctx.forbidden();
    }

    const permissionQuery = await permissionChecker.sanitizedQuery.create(ctx.query);
    // @ts-expect-error populate builder needs to be called with a UID
    const populate = await getService('populate-builder')(model)
      .populateFromQuery(permissionQuery)
      .build();

    const { locale } = getDocumentDimensions(body);
    const document = await entityManager.findOne(id, model, {
      populate,
      locale,
      status: 'draft',
    });

    if (!document) {
      return ctx.notFound();
    }

    const pickPermittedFields = permissionChecker.sanitizeCreateInput;
    const setCreator = setCreatorFields({ user });
    const excludeNotCreatable = excludeNotCreatableFields(model, permissionChecker);
    const sanitizeFn = pipeAsync(pickPermittedFields, setCreator as any, excludeNotCreatable);
    const sanitizedBody = await sanitizeFn(body);

    const clonedDocument = await entityManager.clone(document, sanitizedBody, model);

    const sanitizedDocument = await permissionChecker.sanitizeOutput(clonedDocument);
    ctx.body = await documentMetadata.formatDocumentWithMetadata(model, sanitizedDocument, {
      // Empty metadata as it's not relevant for a new document
      availableLocales: false,
      availableStatus: false,
    });
  },

  async autoClone(ctx: any) {
    const { model } = ctx.params;

    // Trying to automatically clone the entity and model has unique or relational fields
    if (hasProhibitedCloningFields(model)) {
      throw new ApplicationError(
        'Entity could not be cloned as it has unique and/or relational fields. ' +
          'Please edit those fields manually and save to complete the cloning.'
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

    const { locale } = getDocumentDimensions(ctx.query);
    const entity = await entityManager.findOne(id, model, { populate, locale });

    if (!entity) {
      return ctx.notFound();
    }

    if (permissionChecker.cannot.delete(entity)) {
      return ctx.forbidden();
    }

    const result = await entityManager.delete(entity, model, { locale });

    ctx.body = await permissionChecker.sanitizeOutput(result);
  },

  async publish(ctx: any) {
    const { userAbility, user } = ctx.state;
    const { id, model } = ctx.params;

    const entityManager = getService('entity-manager');
    const documentMetadata = getService('document-metadata');
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

    // TODO: Publish many locales
    const { locale = 'en' } = getDocumentDimensions(ctx.request.body);
    const document = await entityManager.findOne(id, model, { populate, locale });

    if (!document) {
      return ctx.notFound();
    }

    if (permissionChecker.cannot.publish(document)) {
      return ctx.forbidden();
    }

    const publishedDocument = await entityManager.publish(document, model, {
      locale,
      data: setCreatorFields({ user, isEdition: true })({}),
    });

    const sanitizedDocument = await permissionChecker.sanitizeOutput(publishedDocument);
    ctx.body = await documentMetadata.formatDocumentWithMetadata(model, sanitizedDocument);
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
    const { userAbility } = ctx.state;
    const { id, model } = ctx.params;

    const entityManager = getService('entity-manager');
    const documentMetadata = getService('document-metadata');
    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.unpublish()) {
      return ctx.forbidden();
    }

    const permissionQuery = await permissionChecker.sanitizedQuery.unpublish(ctx.query);
    // @ts-expect-error populate builder needs to be called with a UID
    const populate = await getService('populate-builder')(model)
      .populateFromQuery(permissionQuery)
      .build();

    // TODO: Unpublish many locales
    const { locale = 'en' } = getDocumentDimensions(ctx.request.body);
    const document = await entityManager.findOne(id, model, {
      populate,
      locale,
      status: 'published',
    });

    if (!document) {
      return ctx.notFound();
    }

    if (permissionChecker.cannot.unpublish(document)) {
      return ctx.forbidden();
    }

    const unpublishedDocument = await entityManager.unpublish(document, model, { locale });

    const sanitizedDocument = await permissionChecker.sanitizeOutput(unpublishedDocument);
    ctx.body = await documentMetadata.formatDocumentWithMetadata(model, sanitizedDocument);
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

    const { locale, status = 'draft' } = getDocumentDimensions(ctx.query);
    const entity = await entityManager.findOne(id, model, { populate, locale, status });

    if (!entity) {
      return ctx.notFound();
    }

    if (permissionChecker.cannot.read(entity)) {
      return ctx.forbidden();
    }

    const number = await entityManager.countDraftRelations(id, model, locale);

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
