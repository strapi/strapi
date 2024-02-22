import { setCreatorFields, mapAsync, pipeAsync, errors } from '@strapi/utils';
import { getService } from '../utils';
import { validateBulkActionInput } from './validation';
import { getProhibitedCloningFields, excludeNotCreatableFields } from './utils/clone';
import { getDocumentLocaleAndStatus } from './utils/dimensions';

/**
 * Create a new document.
 *
 * @param ctx - Koa context
 * @param opts - Options
 * @param opts.populate - Populate options of the returned document.
 *                        By default collectionTypes will populate all relations.
 */
const createDocument = async (ctx: any, opts?: { populate?: object }) => {
  const { userAbility, user } = ctx.state;
  const { model } = ctx.params;
  const { body } = ctx.request;

  const collectionTypes = getService('collection-types');
  const permissionChecker = getService('permission-checker').create({ userAbility, model });

  if (permissionChecker.cannot.create()) {
    throw new errors.ForbiddenError();
  }

  const pickPermittedFields = permissionChecker.sanitizeCreateInput;
  const setCreator = setCreatorFields({ user });
  const sanitizeFn = pipeAsync(pickPermittedFields, setCreator as any);
  const sanitizedBody = await sanitizeFn(body);

  const { locale, status = 'draft' } = getDocumentLocaleAndStatus(body);

  return collectionTypes.create(model, {
    data: sanitizedBody as any,
    locale,
    status,
    populate: opts?.populate,
  });

  // TODO: Revert the creation if create permission conditions are not met
  // if (permissionChecker.cannot.create(document)) {
  //   throw new errors.ForbiddenError();
  // }
};

/**
 * Update a document version.
 * - If the document version exists, it will be updated.
 * - If the document version does not exist, a new document locale will be created.
 *   By default collectionTypes will populate all relations.
 *
 * @param ctx - Koa context
 * @param opts - Options
 * @param opts.populate - Populate options of the returned document
 */
const updateDocument = async (ctx: any, opts?: { populate?: object }) => {
  const { userAbility, user } = ctx.state;
  const { id, model } = ctx.params;
  const { body } = ctx.request;

  const collectionTypes = getService('collection-types');
  const permissionChecker = getService('permission-checker').create({ userAbility, model });

  if (permissionChecker.cannot.update()) {
    throw new errors.ForbiddenError();
  }

  // Populate necessary fields to check permissions
  const permissionQuery = await permissionChecker.sanitizedQuery.update(ctx.query);
  const populate = await getService('populate-builder')(model)
    .populateFromQuery(permissionQuery)
    .build();

  const { locale } = getDocumentLocaleAndStatus(body);

  // Load document version to update
  const [documentVersion, documentExists] = await Promise.all([
    collectionTypes.findOne(id, model, { populate, locale, status: 'draft' }),
    collectionTypes.exists(model, id),
  ]);

  if (!documentExists) {
    throw new errors.NotFoundError();
  }

  // If version is not found, but document exists,
  // the intent is to create a new document locale
  if (documentVersion) {
    if (permissionChecker.cannot.update(documentVersion)) {
      throw new errors.ForbiddenError();
    }
  } else if (permissionChecker.cannot.create()) {
    throw new errors.ForbiddenError();
  }

  const pickPermittedFields = documentVersion
    ? permissionChecker.sanitizeUpdateInput(documentVersion)
    : permissionChecker.sanitizeCreateInput;
  const setCreator = setCreatorFields({ user, isEdition: true });
  const sanitizeFn = pipeAsync(pickPermittedFields, setCreator as any);
  const sanitizedBody = await sanitizeFn(body);

  return collectionTypes.update(documentVersion || { id }, model, {
    data: sanitizedBody as any,
    populate: opts?.populate,
    locale,
  });
};

export default {
  async find(ctx: any) {
    const { userAbility } = ctx.state;
    const { model } = ctx.params;
    const { query } = ctx.request;

    const documentMetadata = getService('document-metadata');
    const collectionTypes = getService('collection-types');
    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.read()) {
      return ctx.forbidden();
    }

    const permissionQuery = await permissionChecker.sanitizedQuery.read(query);

    const populate = await getService('populate-builder')(model)
      .populateFromQuery(permissionQuery)
      .populateDeep(1)
      .countRelations({ toOne: false, toMany: true })
      .build();

    const { locale, status } = getDocumentLocaleAndStatus(query);

    const { results: documents, pagination } = await collectionTypes.findPage(
      { ...permissionQuery, populate, locale, status },
      model
    );

    // TODO: Skip this part if not necessary (if D&P disabled or columns not displayed in the view)
    const documentsAvailableStatus = await documentMetadata.getManyAvailableStatus(
      model,
      documents
    );

    const setStatus = (document: any) => {
      // Available status of document
      const availableStatuses = documentsAvailableStatus.filter((d: any) => d.id === document.id);
      // Compute document version status
      document.status = documentMetadata.getStatus(document, availableStatuses);
      return document;
    };

    const results = await mapAsync(
      documents,
      pipeAsync(permissionChecker.sanitizeOutput, setStatus)
    );

    ctx.body = {
      results,
      pagination,
    };
  },

  async findOne(ctx: any) {
    const { userAbility } = ctx.state;
    const { model, id } = ctx.params;

    const collectionTypes = getService('collection-types');
    const documentMetadata = getService('document-metadata');
    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.read()) {
      return ctx.forbidden();
    }

    const permissionQuery = await permissionChecker.sanitizedQuery.read(ctx.query);
    const populate = await getService('populate-builder')(model)
      .populateFromQuery(permissionQuery)
      .populateDeep(Infinity)
      .countRelations()
      .build();

    const { locale, status = 'draft' } = getDocumentLocaleAndStatus(ctx.query);

    const version = await collectionTypes.findOne(id, model, {
      populate,
      locale,
      status,
    });

    if (!version) {
      // Check if document exists
      const exists = await collectionTypes.exists(model, id);
      if (!exists) {
        return ctx.notFound();
      }

      // If the requested locale doesn't exist, return an empty response
      const { meta } = await documentMetadata.formatDocumentWithMetadata(
        model,
        { id, locale, publishedAt: null },
        { availableLocales: true, availableStatus: false }
      );
      ctx.body = { data: {}, meta };

      return;
    }

    // if the user has condition that needs populated content, it's not applied because entity don't have relations populated
    if (permissionChecker.cannot.read(version)) {
      return ctx.forbidden();
    }

    // TODO: Count populated relations by permissions
    const sanitizedDocument = await permissionChecker.sanitizeOutput(version);
    ctx.body = await documentMetadata.formatDocumentWithMetadata(model, sanitizedDocument);
  },

  async create(ctx: any) {
    const { userAbility } = ctx.state;
    const { model } = ctx.params;

    const documentMetadata = getService('document-metadata');
    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    const [totalEntries, document] = await Promise.all([
      strapi.query(model).count(),
      createDocument(ctx),
    ]);

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
    const { userAbility } = ctx.state;
    const { model } = ctx.params;

    const documentMetadata = getService('document-metadata');
    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    const updatedVersion = await updateDocument(ctx);

    const sanitizedVersion = await permissionChecker.sanitizeOutput(updatedVersion);
    ctx.body = await documentMetadata.formatDocumentWithMetadata(model, sanitizedVersion);
  },

  async clone(ctx: any) {
    const { userAbility, user } = ctx.state;
    const { model, sourceId: id } = ctx.params;
    const { body } = ctx.request;

    const collectionTypes = getService('collection-types');
    const documentMetadata = getService('document-metadata');
    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.create()) {
      return ctx.forbidden();
    }

    const permissionQuery = await permissionChecker.sanitizedQuery.create(ctx.query);
    const populate = await getService('populate-builder')(model)
      .populateFromQuery(permissionQuery)
      .build();

    const { locale } = getDocumentLocaleAndStatus(body);
    const document = await collectionTypes.findOne(id, model, {
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

    const clonedDocument = await collectionTypes.clone(document, sanitizedBody, model);

    const sanitizedDocument = await permissionChecker.sanitizeOutput(clonedDocument);
    ctx.body = await documentMetadata.formatDocumentWithMetadata(model, sanitizedDocument, {
      // Empty metadata as it's not relevant for a new document
      availableLocales: false,
      availableStatus: false,
    });
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

    const collectionTypes = getService('collection-types');
    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.delete()) {
      return ctx.forbidden();
    }

    const permissionQuery = await permissionChecker.sanitizedQuery.delete(ctx.query);
    const populate = await getService('populate-builder')(model)
      .populateFromQuery(permissionQuery)
      .build();

    const { locale } = getDocumentLocaleAndStatus(ctx.query);
    const entity = await collectionTypes.findOne(id, model, { populate, locale });

    if (!entity) {
      return ctx.notFound();
    }

    if (permissionChecker.cannot.delete(entity)) {
      return ctx.forbidden();
    }

    const result = await collectionTypes.delete(entity, model, { locale });

    ctx.body = await permissionChecker.sanitizeOutput(result);
  },

  /**
   * Publish a document version.
   * Supports creating/saving a document and publishing it in one request.
   */
  async publish(ctx: any) {
    const { userAbility } = ctx.state;
    // If id does not exist, the document has to be created
    const { id, model } = ctx.params;
    const { body } = ctx.request;

    const collectionTypes = getService('collection-types');
    const documentMetadata = getService('document-metadata');
    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.publish()) {
      return ctx.forbidden();
    }

    const publishedDocument = await strapi.db.transaction(async () => {
      // Create or update document
      const permissionQuery = await permissionChecker.sanitizedQuery.publish(ctx.query);
      const populate = await getService('populate-builder')(model)
        .populateFromQuery(permissionQuery)
        .populateDeep(Infinity)
        .countRelations()
        .build();

      const document = id
        ? await updateDocument(ctx, { populate })
        : await createDocument(ctx, { populate });

      if (permissionChecker.cannot.publish(document)) {
        throw new errors.ForbiddenError();
      }

      // TODO: Publish many locales at once
      const { locale } = getDocumentLocaleAndStatus(body);
      return collectionTypes.publish(document!, model, {
        locale,
        // TODO: Allow setting creator fields on publish
        // data: setCreatorFields({ user, isEdition: true })({}),
      });
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

    const collectionTypes = getService('collection-types');
    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.publish()) {
      return ctx.forbidden();
    }

    const permissionQuery = await permissionChecker.sanitizedQuery.publish(ctx.query);
    const populate = await getService('populate-builder')(model)
      .populateFromQuery(permissionQuery)
      .populateDeep(Infinity)
      .countRelations()
      .build();

    const entityPromises = ids.map((id: any) => collectionTypes.findOne(id, model, { populate }));
    const entities = await Promise.all(entityPromises);

    for (const entity of entities) {
      if (!entity) {
        return ctx.notFound();
      }

      if (permissionChecker.cannot.publish(entity)) {
        return ctx.forbidden();
      }
    }

    // @ts-expect-error - publish many should not return null
    const { count } = await collectionTypes.publishMany(entities, model);
    ctx.body = { count };
  },

  async bulkUnpublish(ctx: any) {
    const { userAbility } = ctx.state;
    const { model } = ctx.params;
    const { body } = ctx.request;
    const { ids } = body;

    await validateBulkActionInput(body);

    const collectionTypes = getService('collection-types');
    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.unpublish()) {
      return ctx.forbidden();
    }

    const permissionQuery = await permissionChecker.sanitizedQuery.publish(ctx.query);
    const populate = await getService('populate-builder')(model)
      .populateFromQuery(permissionQuery)
      .build();

    const entityPromises = ids.map((id: any) => collectionTypes.findOne(id, model, { populate }));
    const entities = await Promise.all(entityPromises);

    for (const entity of entities) {
      if (!entity) {
        return ctx.notFound();
      }

      if (permissionChecker.cannot.publish(entity)) {
        return ctx.forbidden();
      }
    }

    // @ts-expect-error - unpublish many should not return null
    const { count } = await collectionTypes.unpublishMany(entities, model);
    ctx.body = { count };
  },

  async unpublish(ctx: any) {
    const { userAbility } = ctx.state;
    const { id, model } = ctx.params;
    const {
      body: { discardDraft, ...body },
    } = ctx.request;

    const collectionTypes = getService('collection-types');
    const documentMetadata = getService('document-metadata');
    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.unpublish()) {
      return ctx.forbidden();
    }

    if (discardDraft && permissionChecker.cannot.discard()) {
      return ctx.forbidden();
    }

    const permissionQuery = await permissionChecker.sanitizedQuery.unpublish(ctx.query);

    const populate = await getService('populate-builder')(model)
      .populateFromQuery(permissionQuery)
      .build();

    const { locale } = getDocumentLocaleAndStatus(body);
    const document = await collectionTypes.findOne(id, model, {
      populate,
      locale,
      status: 'published',
    });

    if (!document) {
      throw new errors.NotFoundError();
    }

    if (permissionChecker.cannot.unpublish(document)) {
      throw new errors.ForbiddenError();
    }

    if (discardDraft && permissionChecker.cannot.discard(document)) {
      throw new errors.ForbiddenError();
    }

    await strapi.db.transaction(async () => {
      if (discardDraft) {
        await collectionTypes.discardDraft(document, model, { locale });
      }

      ctx.body = await pipeAsync(
        (document) => collectionTypes.unpublish(document, model, { locale }),
        permissionChecker.sanitizeOutput,
        (document) => documentMetadata.formatDocumentWithMetadata(model, document)
      )(document);
    });
  },

  async discard(ctx: any) {
    const { userAbility } = ctx.state;
    const { id, model } = ctx.params;
    const { body } = ctx.request;

    const collectionTypes = getService('collection-types');
    const documentMetadata = getService('document-metadata');
    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.discard()) {
      return ctx.forbidden();
    }

    const permissionQuery = await permissionChecker.sanitizedQuery.discard(ctx.query);
    const populate = await getService('populate-builder')(model)
      .populateFromQuery(permissionQuery)
      .build();

    const { locale } = getDocumentLocaleAndStatus(body);
    const document = await collectionTypes.findOne(id, model, {
      populate,
      locale,
      status: 'published',
    });

    // Can not discard a document that is not published
    if (!document) {
      return ctx.notFound();
    }

    if (permissionChecker.cannot.discard(document)) {
      return ctx.forbidden();
    }

    ctx.body = await pipeAsync(
      (document) => collectionTypes.discardDraft(document, model, { locale }),
      permissionChecker.sanitizeOutput,
      (document) => documentMetadata.formatDocumentWithMetadata(model, document)
    )(document);
  },

  async bulkDelete(ctx: any) {
    const { userAbility } = ctx.state;
    const { model } = ctx.params;
    const { query, body } = ctx.request;
    const { ids } = body;

    await validateBulkActionInput(body);

    const collectionTypes = getService('collection-types');
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

    const { count } = await collectionTypes.deleteMany(params, model);

    ctx.body = { count };
  },

  async countDraftRelations(ctx: any) {
    const { userAbility } = ctx.state;
    const { model, id } = ctx.params;

    const collectionTypes = getService('collection-types');
    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.read()) {
      return ctx.forbidden();
    }

    const permissionQuery = await permissionChecker.sanitizedQuery.read(ctx.query);
    const populate = await getService('populate-builder')(model)
      .populateFromQuery(permissionQuery)
      .build();

    const { locale, status = 'draft' } = getDocumentLocaleAndStatus(ctx.query);
    const entity = await collectionTypes.findOne(id, model, { populate, locale, status });

    if (!entity) {
      return ctx.notFound();
    }

    if (permissionChecker.cannot.read(entity)) {
      return ctx.forbidden();
    }

    const number = await collectionTypes.countDraftRelations(id, model, locale);

    return {
      data: number,
    };
  },

  async countManyEntriesDraftRelations(ctx: any) {
    const { userAbility } = ctx.state;
    const ids = ctx.request.query.ids as any;
    const locale = ctx.request.query.locale;
    const { model } = ctx.params;

    const collectionTypes = getService('collection-types');
    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.read()) {
      return ctx.forbidden();
    }

    // @ts-expect-error - ids are not in .find
    const entities = await collectionTypes.find({ ids, locale }, model);

    if (!entities) {
      return ctx.notFound();
    }

    const number = await collectionTypes.countManyEntriesDraftRelations(ids, model, locale);

    return {
      data: number,
    };
  },
};
