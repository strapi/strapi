import { errors, contentTypes, async as asyncPipe, setCreatorFields } from '@strapi/utils';
import type { Core, Modules, UID } from '@strapi/types';

import { getService } from '../../utils';
import { getDocumentLocaleAndStatus } from '../../controllers/validation/dimensions';
import { formatDocumentWithMetadata } from '../../controllers/utils/metadata';
import { indexByDocumentId } from '../../controllers/utils/document-status';
import { getPopulateForLocalizations } from '../../services/utils/populate';
import {
  MCP_NOT_FOUND_DOCUMENT,
  MCP_NOT_FOUND_LOCALE,
  MCP_NOT_FOUND_OR_PUBLISHED,
} from './constants';
import { isContentTypeLocalized } from '../permissions';
import { shapeRelationsForMcp } from '../sanitizers/shape-relations';
import { extractInlineRelationKeys } from '../schemas/query-schema';
import {
  ok,
  sanitizeFormatShape,
  buildInlineOptions,
  enforceResponseBudget,
  getMaxResponseBytes,
} from '../utils';

type McpDocumentQuery = {
  populate?: unknown;
  locale?: string;
  status?: string;
  filters?: unknown;
  sort?: unknown;
  pagination?: unknown;
  [key: string]: unknown;
};

type McpFindManyParams = Parameters<Modules.Documents.ServiceInstance['findMany']>[0];

// ---------------------------------------------------------------------------
// Arg types — type-level only; runtime validation is handled by the MCP SDK
// ---------------------------------------------------------------------------

type CollectionListArgs = {
  locale?: string;
  status?: 'draft' | 'published';
  page?: number;
  pageSize?: number;
  sort?: unknown;
  filters?: unknown;
  fields?: unknown;
  populate?: unknown;
  maxDepth?: number;
};

type DocumentLocaleArgs = {
  documentId: string;
  locale?: string;
};

type CollectionGetArgs = DocumentLocaleArgs & {
  status?: 'draft' | 'published';
  fields?: unknown;
  populate?: unknown;
  maxDepth?: number;
};

type CollectionCreateArgs = {
  data: Record<string, unknown>;
  locale?: string;
};

type CollectionUpdateArgs = DocumentLocaleArgs & {
  data: Record<string, unknown>;
};

type CollectionUnpublishArgs = DocumentLocaleArgs & {
  discardDraft?: boolean;
};

// ---------------------------------------------------------------------------
// Handler factories
// ---------------------------------------------------------------------------

/**
 * Creates a handler for listing (paginated) documents of a collection-type.
 * Enforces RBAC read permission and sanitizes query + output via permissionChecker.
 */
export const createCollectionListHandler =
  (uid: UID.CollectionType) =>
  (strapi: Core.Strapi, context: Modules.MCP.McpHandlerContext) =>
  async ({ args }: { args: CollectionListArgs }): Promise<Modules.MCP.McpToolHandlerReturn> => {
    const { userAbility } = context;
    const {
      locale,
      status,
      page,
      pageSize,
      sort,
      filters,
      fields,
      populate: populateArg,
      maxDepth,
    } = args;

    const documentMetadata = getService('document-metadata');
    const documentManager = getService('document-manager');
    const permissionChecker = getService('permission-checker').create({ userAbility, model: uid });

    if (permissionChecker.cannot.read()) {
      throw new errors.ForbiddenError();
    }

    const query: Record<string, unknown> = {
      ...(page !== undefined && { page }),
      ...(pageSize !== undefined && { pageSize }),
      ...(sort !== undefined && { sort }),
      ...(filters !== undefined && { filters }),
      ...(fields !== undefined && { fields }),
      ...(populateArg !== undefined && { populate: populateArg }),
    };

    const permissionQuery = await permissionChecker.sanitizedQuery.read(query);

    // When `populate` is explicit, honor it exactly (populateFromQuery). Otherwise keep the
    // legacy auto-populate to depth 1 (overridable via `maxDepth`). Inlining is opt-in and
    // driven off the sanitized populate so RBAC-denied relations are never inlined.
    const populateBuilder = getService('populate-builder')(uid).populateFromQuery(permissionQuery);
    if (populateArg === undefined) {
      populateBuilder.populateDeep(maxDepth ?? 1);
    }
    const populate = await populateBuilder
      .withPopulateOverride(getPopulateForLocalizations(uid))
      .build();

    const inlineKeys = extractInlineRelationKeys(
      (permissionQuery as { populate?: unknown }).populate ?? populateArg,
      strapi.getModel(uid).attributes
    );
    const inlineOptions = buildInlineOptions(inlineKeys, context);

    const { locale: resolvedLocale, status: resolvedStatus } = await getDocumentLocaleAndStatus(
      { locale, status },
      uid
    );

    const findPageQuery: McpDocumentQuery = {
      ...permissionQuery,
      populate,
      locale: resolvedLocale,
      status: resolvedStatus,
    };
    const { results: documents, pagination } = await documentManager.findPage(
      findPageQuery as McpFindManyParams,
      uid
    );

    const hasDraftAndPublish = contentTypes.hasDraftAndPublish(strapi.getModel(uid));
    const statusByDocumentId = hasDraftAndPublish
      ? indexByDocumentId(await documentMetadata.getManyAvailableStatus(uid, documents))
      : new Map();

    const setStatus = (document: any) => {
      const availableStatuses = statusByDocumentId.get(document.documentId) || [];
      document.status = documentMetadata.getStatus(document, availableStatuses);
      return document;
    };

    // Calculate, then strip: setStatus reads top-level publishedAt/updatedAt, so it must
    // run before relation shaping reduces the document at the output boundary.
    const results = await asyncPipe.map(
      documents,
      asyncPipe.pipe(
        (doc: unknown) => permissionChecker.sanitizeOutput(doc),
        setStatus,
        (doc: Record<string, unknown>) => shapeRelationsForMcp(uid, doc, inlineOptions)
      )
    );

    const structuredContent = enforceResponseBudget(
      { results, pagination },
      getMaxResponseBytes(strapi),
      (notice) => ({ results: [], pagination, truncated: true, notice })
    );

    return ok(structuredContent);
  };

/**
 * Creates a handler for fetching a single collection-type document by `documentId`.
 * Enforces RBAC read permission; returns available locale metadata when the locale is missing.
 */
export const createCollectionGetHandler =
  (uid: UID.CollectionType) =>
  (strapi: Core.Strapi, context: Modules.MCP.McpHandlerContext) =>
  async ({
    args,
  }: {
    args: Record<string, unknown>;
  }): Promise<Modules.MCP.McpToolHandlerReturn> => {
    const { userAbility } = context;
    const {
      documentId,
      locale,
      status,
      fields,
      populate: populateArg,
      maxDepth,
    } = args as CollectionGetArgs;

    const documentManager = getService('document-manager');
    const permissionChecker = getService('permission-checker').create({ userAbility, model: uid });

    if (permissionChecker.cannot.read()) {
      throw new errors.ForbiddenError();
    }

    const permissionQuery = await permissionChecker.sanitizedQuery.read({
      locale,
      status,
      ...(fields !== undefined && { fields }),
      ...(populateArg !== undefined && { populate: populateArg }),
    });

    // Explicit populate → honor exactly. Otherwise keep legacy infinite-depth auto-populate
    // (overridable via `maxDepth`). Inlining is opt-in, off the sanitized populate.
    const populateBuilder = getService('populate-builder')(uid).populateFromQuery(permissionQuery);
    if (populateArg === undefined) {
      populateBuilder.populateDeep(maxDepth ?? Infinity);
    }
    const populate = await populateBuilder
      .withPopulateOverride(getPopulateForLocalizations(uid))
      .build();

    const inlineKeys = extractInlineRelationKeys(
      (permissionQuery as { populate?: unknown }).populate ?? populateArg,
      strapi.getModel(uid).attributes
    );
    const inlineOptions = buildInlineOptions(inlineKeys, context);

    const { locale: resolvedLocale, status: resolvedStatus } = await getDocumentLocaleAndStatus(
      { locale, status },
      uid
    );

    const version = await documentManager.findOne(documentId, uid, {
      populate,
      locale: resolvedLocale,
      status: resolvedStatus,
    });

    if (!version) {
      const exists = await documentManager.exists(uid, documentId);
      if (!exists) {
        throw new errors.NotFoundError(MCP_NOT_FOUND_DOCUMENT);
      }

      const { meta } = await formatDocumentWithMetadata(
        permissionChecker,
        uid,
        { documentId, locale: resolvedLocale, publishedAt: null } as Parameters<
          typeof formatDocumentWithMetadata
        >[2],
        { availableLocales: true, availableStatus: false }
      );

      return ok({ data: {}, meta } as Record<string, unknown>);
    }

    if (permissionChecker.cannot.read(version)) {
      throw new errors.ForbiddenError();
    }

    const result = await sanitizeFormatShape(
      permissionChecker,
      uid,
      version,
      undefined,
      inlineOptions
    );

    const structuredContent = enforceResponseBudget(
      result,
      getMaxResponseBytes(strapi),
      (notice) => ({ data: null, meta: result.meta, truncated: true, notice })
    );

    return ok(structuredContent);
  };

/**
 * Creates a handler for creating a new collection-type document.
 * Enforces RBAC create permission; sanitizes input and stamps creator fields.
 */
export const createCollectionCreateHandler =
  (uid: UID.CollectionType) =>
  (strapi: Core.Strapi, context: Modules.MCP.McpHandlerContext) =>
  async ({
    args,
  }: {
    args: Record<string, unknown>;
  }): Promise<Modules.MCP.McpToolHandlerReturn> => {
    const { userAbility, user } = context;
    const { data, locale } = args as CollectionCreateArgs;

    const documentManager = getService('document-manager');
    const permissionChecker = getService('permission-checker').create({ userAbility, model: uid });

    if (permissionChecker.cannot.create()) {
      throw new errors.ForbiddenError();
    }

    const sanitizedData = setCreatorFields({ user })(
      await permissionChecker.sanitizeCreateInput(data)
    ) as Record<string, unknown>;

    const { locale: resolvedLocale, status } = await getDocumentLocaleAndStatus({ locale }, uid);

    const result = await strapi.db.transaction(async () => {
      const document = await documentManager.create(uid, {
        data: sanitizedData,
        locale: resolvedLocale,
        status,
      });

      return sanitizeFormatShape(permissionChecker, uid, document, {
        availableLocales: false,
        availableStatus: false,
      });
    });

    return ok(result as Record<string, unknown>);
  };

/**
 * Creates a handler for updating an existing collection-type document draft.
 * Creates a new locale version when the target locale does not yet exist for the document.
 * Enforces RBAC update (or create) permission accordingly.
 */
export const createCollectionUpdateHandler =
  (uid: UID.CollectionType) =>
  (strapi: Core.Strapi, context: Modules.MCP.McpHandlerContext) =>
  async ({
    args,
  }: {
    args: Record<string, unknown>;
  }): Promise<Modules.MCP.McpToolHandlerReturn> => {
    const { userAbility, user } = context;
    const { documentId, data, locale } = args as CollectionUpdateArgs;

    const documentManager = getService('document-manager');
    const permissionChecker = getService('permission-checker').create({ userAbility, model: uid });

    if (permissionChecker.cannot.update()) {
      throw new errors.ForbiddenError();
    }

    const permissionQuery = await permissionChecker.sanitizedQuery.update({ locale });
    const populate = await getService('populate-builder')(uid)
      .populateFromQuery(permissionQuery)
      .build();

    const { locale: resolvedLocale } = await getDocumentLocaleAndStatus({ locale }, uid);

    const [documentVersion, documentExists] = await Promise.all([
      documentManager.findOne(documentId, uid, {
        populate,
        locale: resolvedLocale,
        status: 'draft',
      }),
      documentManager.exists(uid, documentId),
    ]);

    if (!documentExists) {
      throw new errors.NotFoundError(MCP_NOT_FOUND_DOCUMENT);
    }

    // If version is not found but document exists, the intent is to create a new locale
    if (documentVersion) {
      if (permissionChecker.cannot.update(documentVersion)) {
        throw new errors.ForbiddenError();
      }
    } else if (permissionChecker.cannot.create()) {
      throw new errors.ForbiddenError();
    }

    const sanitizeInput = documentVersion
      ? permissionChecker.sanitizeUpdateInput(documentVersion)
      : permissionChecker.sanitizeCreateInput;

    const isEdition = documentVersion !== null && documentVersion !== undefined;
    const sanitizedData = setCreatorFields({ user, isEdition })(
      await sanitizeInput(data)
    ) as Record<string, unknown>;

    const result = await strapi.db.transaction(async () => {
      const updatedDocument = await documentManager.update(
        documentVersion?.documentId ?? documentId,
        uid,
        { data: sanitizedData, locale: resolvedLocale }
      );

      return sanitizeFormatShape(permissionChecker, uid, updatedDocument);
    });

    return ok(result as Record<string, unknown>);
  };

/**
 * Creates a handler for deleting a collection-type document (or a specific locale).
 * Enforces RBAC delete permission on every locale version before deletion.
 */
export const createCollectionDeleteHandler =
  (uid: UID.CollectionType) =>
  (strapi: Core.Strapi, context: Modules.MCP.McpHandlerContext) =>
  async ({
    args,
  }: {
    args: Record<string, unknown>;
  }): Promise<Modules.MCP.McpToolHandlerReturn> => {
    const { userAbility } = context;
    const { documentId, locale } = args as DocumentLocaleArgs;

    const documentManager = getService('document-manager');
    const permissionChecker = getService('permission-checker').create({ userAbility, model: uid });

    if (permissionChecker.cannot.delete()) {
      throw new errors.ForbiddenError();
    }

    const permissionQuery = await permissionChecker.sanitizedQuery.delete({ locale });
    const populate = await getService('populate-builder')(uid)
      .populateFromQuery(permissionQuery)
      .build();

    const { locale: resolvedLocale } = await getDocumentLocaleAndStatus({ locale }, uid);

    const isLocalized = isContentTypeLocalized(strapi, uid);

    const localeForQuery = isLocalized === true ? resolvedLocale : undefined;

    const documentLocales = await documentManager.findLocales(documentId, uid, {
      populate,
      locale: localeForQuery,
    });

    if (documentLocales.length === 0) {
      throw new errors.NotFoundError(MCP_NOT_FOUND_DOCUMENT);
    }

    for (const document of documentLocales) {
      if (permissionChecker.cannot.delete(document)) {
        throw new errors.ForbiddenError();
      }
    }

    const result = await documentManager.delete(documentId, uid, { locale: localeForQuery });
    // Delete returns `{ data }` without metadata — no status to compute, so sanitize + shape only.
    const sanitizedResult = await permissionChecker.sanitizeOutput(result);
    const shapedResult = await shapeRelationsForMcp(uid, sanitizedResult);

    return ok({ data: shapedResult } as Record<string, unknown>);
  };

/**
 * Creates a handler for publishing a collection-type document draft.
 * Enforces RBAC publish permission; throws NotFound when the draft or document is missing.
 */
export const createCollectionPublishHandler =
  (uid: UID.CollectionType) =>
  (strapi: Core.Strapi, context: Modules.MCP.McpHandlerContext) =>
  async ({
    args,
  }: {
    args: Record<string, unknown>;
  }): Promise<Modules.MCP.McpToolHandlerReturn> => {
    const { userAbility } = context;
    const { documentId, locale } = args as DocumentLocaleArgs;

    const documentManager = getService('document-manager');
    const permissionChecker = getService('permission-checker').create({ userAbility, model: uid });

    if (permissionChecker.cannot.publish()) {
      throw new errors.ForbiddenError();
    }

    const { locale: resolvedLocale } = await getDocumentLocaleAndStatus({ locale }, uid);

    const publishedDocument = await strapi.db.transaction(async () => {
      const exists = await documentManager.exists(uid, documentId);
      if (!exists) {
        throw new errors.NotFoundError(MCP_NOT_FOUND_DOCUMENT);
      }

      const document = await documentManager.findOne(documentId, uid, {
        locale: resolvedLocale,
        status: 'draft',
      });

      if (!document) {
        throw new errors.NotFoundError(MCP_NOT_FOUND_LOCALE);
      }

      if (permissionChecker.cannot.publish(document)) {
        throw new errors.ForbiddenError();
      }

      const publishResult = await documentManager.publish(document.documentId, uid, {
        locale: resolvedLocale,
      });

      if (!publishResult || publishResult.length === 0) {
        throw new errors.NotFoundError(MCP_NOT_FOUND_OR_PUBLISHED);
      }

      return publishResult[0];
    });

    const result = await sanitizeFormatShape(permissionChecker, uid, publishedDocument);

    return ok(result as Record<string, unknown>);
  };

/**
 * Creates a handler for unpublishing a collection-type document.
 * Optionally discards the draft in the same transaction when `discardDraft` is true.
 * Enforces RBAC unpublish (and discard) permission.
 */
export const createCollectionUnpublishHandler =
  (uid: UID.CollectionType) =>
  (strapi: Core.Strapi, context: Modules.MCP.McpHandlerContext) =>
  async ({
    args,
  }: {
    args: Record<string, unknown>;
  }): Promise<Modules.MCP.McpToolHandlerReturn> => {
    const { userAbility } = context;
    const { documentId, locale, discardDraft } = args as CollectionUnpublishArgs;

    const documentManager = getService('document-manager');
    const permissionChecker = getService('permission-checker').create({ userAbility, model: uid });

    if (permissionChecker.cannot.unpublish()) {
      throw new errors.ForbiddenError();
    }

    if (discardDraft === true && permissionChecker.cannot.discard()) {
      throw new errors.ForbiddenError();
    }

    const permissionQuery = await permissionChecker.sanitizedQuery.unpublish({ locale });
    const populate = await getService('populate-builder')(uid)
      .populateFromQuery(permissionQuery)
      .build();

    const { locale: resolvedLocale } = await getDocumentLocaleAndStatus({ locale }, uid);

    const document = await documentManager.findOne(documentId, uid, {
      populate,
      locale: resolvedLocale,
      status: 'published',
    });

    if (!document) {
      throw new errors.NotFoundError(MCP_NOT_FOUND_DOCUMENT);
    }

    if (permissionChecker.cannot.unpublish(document)) {
      throw new errors.ForbiddenError();
    }

    if (discardDraft === true && permissionChecker.cannot.discard(document)) {
      throw new errors.ForbiddenError();
    }

    const unpublishedDocument = await strapi.db.transaction(async () => {
      if (discardDraft === true) {
        await documentManager.discardDraft(document.documentId, uid, { locale: resolvedLocale });
      }

      return documentManager.unpublish(document.documentId, uid, { locale: resolvedLocale });
    });

    const result = await sanitizeFormatShape(permissionChecker, uid, unpublishedDocument);

    return ok(result as Record<string, unknown>);
  };

/**
 * Creates a handler for discarding the draft of a collection-type document.
 * Restores the published version as the draft. Enforces RBAC discard permission.
 */
export const createCollectionDiscardDraftHandler =
  (uid: UID.CollectionType) =>
  (_strapi: Core.Strapi, context: Modules.MCP.McpHandlerContext) =>
  async ({
    args,
  }: {
    args: Record<string, unknown>;
  }): Promise<Modules.MCP.McpToolHandlerReturn> => {
    const { userAbility } = context;
    const { documentId, locale } = args as DocumentLocaleArgs;

    const documentManager = getService('document-manager');
    const permissionChecker = getService('permission-checker').create({ userAbility, model: uid });

    if (permissionChecker.cannot.discard()) {
      throw new errors.ForbiddenError();
    }

    const permissionQuery = await permissionChecker.sanitizedQuery.discard({ locale });
    const populate = await getService('populate-builder')(uid)
      .populateFromQuery(permissionQuery)
      .build();

    const { locale: resolvedLocale } = await getDocumentLocaleAndStatus({ locale }, uid);

    const document = await documentManager.findOne(documentId, uid, {
      populate,
      locale: resolvedLocale,
      status: 'published',
    });

    if (!document) {
      throw new errors.NotFoundError(MCP_NOT_FOUND_DOCUMENT);
    }

    if (permissionChecker.cannot.discard(document)) {
      throw new errors.ForbiddenError();
    }

    const discardedDocument = await asyncPipe.pipe(
      (doc: any) => documentManager.discardDraft(doc.documentId, uid, { locale: resolvedLocale }),
      (doc: unknown) => sanitizeFormatShape(permissionChecker, uid, doc)
    )(document);

    return ok(discardedDocument as Record<string, unknown>);
  };
