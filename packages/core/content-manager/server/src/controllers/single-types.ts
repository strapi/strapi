import { setCreatorFields, pipeAsync, errors } from '@strapi/utils';

import { getService } from '../utils';

const findDocument = async (query: any, model: any, opts: any = {}) => {
  const entityManager = getService('entity-manager');

  // @ts-expect-error populate builder needs to be called with a UID
  const populate = await getService('populate-builder')(model)
    .populateFromQuery(query)
    .populateDeep(Infinity)
    .countRelations()
    .build();

  return entityManager.find(query, model, { ...opts, populate });
};

/**
 * From a request object, validates and returns the locale and status of the document
 */
const getDocumentDimensions = (request: any) => {
  const { locale, status, ...rest } = request || {};
  // Sanitize locale and status
  // Check locale format is a valid locale identifier
  if (locale && !/^[a-z]{2}(-[A-Z]{2})?$/.test(locale)) {
    throw new errors.ValidationError(`Invalid locale format: ${locale}`);
  }

  if (status && !['draft', 'published'].includes(status)) {
    throw new errors.ValidationError(`Invalid status: ${status}`);
  }

  return { locale, status, ...rest };
};

export default {
  async find(ctx: any) {
    const { userAbility } = ctx.state;
    const { model } = ctx.params;
    const { query = {} } = ctx.request;

    const permissionChecker = getService('permission-checker').create({ userAbility, model });
    const documentMetadata = getService('document-metadata');

    if (permissionChecker.cannot.read()) {
      return ctx.forbidden();
    }

    const permissionQuery = await permissionChecker.sanitizedQuery.read(query);
    const { locale, status } = getDocumentDimensions(query);

    const document = await findDocument(permissionQuery, model, { locale, status });

    // allow user with create permission to know a single type is not created
    if (!document) {
      if (permissionChecker.cannot.create()) {
        return ctx.forbidden();
      }

      return ctx.notFound();
    }

    if (permissionChecker.cannot.read(document)) {
      return ctx.forbidden();
    }

    const sanitizedDocument = await permissionChecker.sanitizeOutput(document);
    ctx.body = await documentMetadata.formatDocumentWithMetadata(model, sanitizedDocument);
  },

  async createOrUpdate(ctx: any) {
    const { user, userAbility } = ctx.state;
    const { model } = ctx.params;
    const { body, query } = ctx.request;

    const entityManager = getService('entity-manager');
    const documentMetadata = getService('document-metadata');
    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.create() && permissionChecker.cannot.update()) {
      return ctx.forbidden();
    }

    const sanitizedQuery = await permissionChecker.sanitizedQuery.update(query);

    const { locale } = getDocumentDimensions(body);
    const document = await findDocument(sanitizedQuery, model, { locale, status: 'draft' });

    // Load document version to update
    const [documentVersion, documentExists] = await Promise.all([
      findDocument(sanitizedQuery, model, { locale, status: 'draft' }),
      entityManager.exists(model),
    ]);

    const pickPermittedFields = document
      ? permissionChecker.sanitizeUpdateInput(document)
      : permissionChecker.sanitizeCreateInput;

    const setCreator = document
      ? setCreatorFields({ user, isEdition: true })
      : setCreatorFields({ user });

    const sanitizeFn = pipeAsync(pickPermittedFields, setCreator as any);

    if (!documentExists) {
      const sanitizedBody = await sanitizeFn(body);
      const newDocument = await entityManager.create(model, {
        data: sanitizedBody,
        ...sanitizedQuery,
        locale,
      });
      const sanitizedDocument = await permissionChecker.sanitizeOutput(newDocument);
      ctx.body = await documentMetadata.formatDocumentWithMetadata(model, sanitizedDocument);

      await strapi.telemetry.send('didCreateFirstContentTypeEntry', {
        eventProperties: { model },
      });
      return;
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

    const sanitizedBody = await sanitizeFn(body);
    const updatedDocument = await entityManager.update(documentVersion, model, {
      data: sanitizedBody,
      locale,
    });
    const sanitizedDocument = await permissionChecker.sanitizeOutput(updatedDocument);
    ctx.body = await documentMetadata.formatDocumentWithMetadata(model, sanitizedDocument);
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
    const { locale } = getDocumentDimensions(query);

    const document = await findDocument(sanitizedQuery, model, { locale });

    if (!document) {
      return ctx.notFound();
    }

    if (permissionChecker.cannot.delete(document)) {
      return ctx.forbidden();
    }

    const deletedEntity = await entityManager.delete(document, model, { locale });

    ctx.body = await permissionChecker.sanitizeOutput(deletedEntity);
  },

  async publish(ctx: any) {
    const { userAbility, user } = ctx.state;
    const { model } = ctx.params;
    const { body, query = {} } = ctx.request;

    const entityManager = getService('entity-manager');
    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.publish()) {
      return ctx.forbidden();
    }

    const sanitizedQuery = await permissionChecker.sanitizedQuery.publish(query);
    const { locale } = getDocumentDimensions(body);

    const document = await findDocument(sanitizedQuery, model, { locale });

    if (!document) {
      return ctx.notFound();
    }

    if (permissionChecker.cannot.publish(document)) {
      return ctx.forbidden();
    }

    const publishedEntity = await entityManager.publish(
      document,
      model,
      setCreatorFields({ user, isEdition: true })({})
    );

    ctx.body = await permissionChecker.sanitizeOutput(publishedEntity);
  },

  async unpublish(ctx: any) {
    const { userAbility, user } = ctx.state;
    const { model } = ctx.params;
    const { body, query = {} } = ctx.request;

    const entityManager = getService('entity-manager');
    const permissionChecker = getService('permission-checker').create({ userAbility, model });

    if (permissionChecker.cannot.unpublish()) {
      return ctx.forbidden();
    }

    const sanitizedQuery = await permissionChecker.sanitizedQuery.unpublish(query);
    const { locale } = getDocumentDimensions(body);

    const document = await findDocument(sanitizedQuery, model, { locale });

    if (!document) {
      return ctx.notFound();
    }

    if (permissionChecker.cannot.unpublish(document)) {
      return ctx.forbidden();
    }

    const unpublishedEntity = await entityManager.unpublish(
      document,
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

    const document = await findDocument({}, model);
    if (!document) {
      return ctx.notFound();
    }

    if (permissionChecker.cannot.read(document)) {
      return ctx.forbidden();
    }

    const number = await entityManager.countDraftRelations(document.id, model);

    return {
      data: number,
    };
  },
};
