import { errors, async as asyncPipe, setCreatorFields } from '@strapi/utils';
import type { Core, Modules, UID } from '@strapi/types';

import { getService } from '../../utils';
import { getDocumentLocaleAndStatus } from '../../controllers/validation/dimensions';
import { formatDocumentWithMetadata } from '../../controllers/utils/metadata';
import { getPopulateForLocalizations } from '../../services/utils/populate';
import { MCP_NOT_FOUND_DOCUMENT } from './constants';
import { isContentTypeLocalized } from '../permissions';
import { ok } from '../utils';

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
// Input arg schemas — used for type-safe narrowing from Record<string, unknown>
// ---------------------------------------------------------------------------

type SingleLocaleArgs = { locale?: string };
type SingleGetArgs = SingleLocaleArgs & { status?: 'draft' | 'published' };
type SingleUnpublishArgs = SingleLocaleArgs & { discardDraft?: boolean };
type SingleWriteArgs = { data: Record<string, unknown>; locale?: string };

// ---------------------------------------------------------------------------
// Shared create-or-update logic mirroring single-types controller
// ---------------------------------------------------------------------------

/**
 * Core write logic shared by the single-type write handler.
 * Creates the document when none exists; updates the existing draft otherwise.
 * Enforces RBAC create/update permission and sanitizes input + output.
 */
export const singleCreateOrUpdate = async (
  strapi: Core.Strapi,
  uid: UID.SingleType,
  context: Modules.MCP.McpHandlerContext,
  args: SingleWriteArgs
): Promise<Modules.MCP.McpToolHandlerReturn> => {
  const { userAbility, user } = context;
  const { data, locale } = args;
  // TODO: fix UID.SingleType assignability in @strapi/types
  const typedUid = uid as UID.ContentType;

  const documentManager = getService('document-manager');
  const permissionChecker = getService('permission-checker').create({
    userAbility,
    model: uid as string,
  });

  if (permissionChecker.cannot.create() && permissionChecker.cannot.update()) {
    throw new errors.ForbiddenError();
  }

  const sanitizedQuery = await permissionChecker.sanitizedQuery.update({ locale });
  const { locale: resolvedLocale } = await getDocumentLocaleAndStatus({ locale }, uid);

  const populate = await getService('populate-builder')(typedUid)
    .populateFromQuery(sanitizedQuery)
    .populateDeep(Infinity)
    .countRelations()
    .withPopulateOverride(getPopulateForLocalizations(typedUid))
    .build();

  const draftFindQuery: McpDocumentQuery = {
    ...sanitizedQuery,
    populate,
    locale: resolvedLocale,
    status: 'draft',
  };
  const [documentVersion, otherDocumentVersion] = await Promise.all([
    documentManager
      .findMany(draftFindQuery as McpFindManyParams, typedUid)
      .then((docs: any[]) => docs[0]),
    strapi.db.query(typedUid).findOne({ select: ['documentId'] }),
  ]);

  const documentId = otherDocumentVersion?.documentId;

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
  const sanitizedData = setCreatorFields({ user, isEdition })(await sanitizeInput(data)) as Record<
    string,
    unknown
  >;

  const formatted = await strapi.db.transaction(async () => {
    let doc: any;

    if (documentId === undefined) {
      doc = await documentManager.create(typedUid, {
        data: sanitizedData,
        ...sanitizedQuery,
        locale: resolvedLocale,
      });
    } else {
      doc = await documentManager.update(documentId, typedUid, {
        data: sanitizedData,
        populate,
        locale: resolvedLocale,
      });
    }

    const sanitizedDocument = await permissionChecker.sanitizeOutput(doc);
    return formatDocumentWithMetadata(permissionChecker, typedUid, sanitizedDocument);
  });

  return ok(formatted as Record<string, unknown>);
};

// ---------------------------------------------------------------------------
// Handler factories
// ---------------------------------------------------------------------------

/**
 * Creates a handler for reading the single-type document.
 * Returns available locale metadata when the requested locale version does not exist.
 * Enforces RBAC read permission.
 */
export const createSingleGetHandler =
  (uid: UID.SingleType) =>
  (strapi: Core.Strapi, context: Modules.MCP.McpHandlerContext) =>
  async ({ args }: { args: SingleGetArgs }): Promise<Modules.MCP.McpToolHandlerReturn> => {
    const { userAbility } = context;
    const { locale, status } = args;
    // TODO: fix UID.SingleType assignability in @strapi/types
    const typedUid = uid as UID.ContentType;

    const permissionChecker = getService('permission-checker').create({
      userAbility,
      model: uid as string,
    });

    if (permissionChecker.cannot.read()) {
      throw new errors.ForbiddenError();
    }

    const permissionQuery = await permissionChecker.sanitizedQuery.read({ locale, status });
    const { locale: resolvedLocale, status: resolvedStatus } = await getDocumentLocaleAndStatus(
      { locale, status },
      uid
    );

    const populate = await getService('populate-builder')(typedUid)
      .populateFromQuery(permissionQuery)
      .populateDeep(Infinity)
      .countRelations()
      .withPopulateOverride(getPopulateForLocalizations(typedUid))
      .build();

    const versionFindQuery: McpDocumentQuery = {
      ...permissionQuery,
      populate,
      locale: resolvedLocale,
      status: resolvedStatus,
    };
    const version = await getService('document-manager')
      .findMany(versionFindQuery as McpFindManyParams, typedUid)
      .then((docs: any[]) => docs[0]);

    if (!version) {
      if (permissionChecker.cannot.create()) {
        throw new errors.ForbiddenError();
      }

      const document = await strapi.db.query(typedUid).findOne({});

      if (!document) {
        throw new errors.NotFoundError(MCP_NOT_FOUND_DOCUMENT);
      }

      const { meta } = await formatDocumentWithMetadata(
        permissionChecker,
        typedUid,
        {
          documentId: document.documentId,
          locale: resolvedLocale,
          publishedAt: null,
        } as Parameters<typeof formatDocumentWithMetadata>[2],
        { availableLocales: true, availableStatus: false }
      );

      return ok({ data: {}, meta } as Record<string, unknown>);
    }

    if (permissionChecker.cannot.read(version)) {
      throw new errors.ForbiddenError();
    }

    const sanitizedDocument = await permissionChecker.sanitizeOutput(version);
    const result = await formatDocumentWithMetadata(permissionChecker, typedUid, sanitizedDocument);

    return ok(result as Record<string, unknown>);
  };

/**
 * Creates a handler for creating or updating the single-type document.
 * Delegates to `singleCreateOrUpdate`; enforces RBAC create/update permission.
 */
export const createSingleWriteHandler =
  (uid: UID.SingleType) =>
  (strapi: Core.Strapi, context: Modules.MCP.McpHandlerContext) =>
  async ({
    args,
  }: {
    args: Record<string, unknown>;
  }): Promise<Modules.MCP.McpToolHandlerReturn> => {
    return singleCreateOrUpdate(strapi, uid, context, args as SingleWriteArgs);
  };

/**
 * Creates a handler for deleting the single-type document (or a specific locale).
 * Enforces RBAC delete permission on every locale version before deletion.
 */
export const createSingleDeleteHandler =
  (uid: UID.SingleType) =>
  (strapi: Core.Strapi, context: Modules.MCP.McpHandlerContext) =>
  async ({ args }: { args: SingleLocaleArgs }): Promise<Modules.MCP.McpToolHandlerReturn> => {
    const { userAbility } = context;
    const { locale } = args;
    // TODO: fix UID.SingleType assignability in @strapi/types
    const typedUid = uid as UID.ContentType;

    const documentManager = getService('document-manager');
    const permissionChecker = getService('permission-checker').create({
      userAbility,
      model: uid as string,
    });

    if (permissionChecker.cannot.delete()) {
      throw new errors.ForbiddenError();
    }

    const sanitizedQuery = await permissionChecker.sanitizedQuery.delete({ locale });

    const populate = await getService('populate-builder')(typedUid)
      .populateFromQuery(sanitizedQuery)
      .populateDeep(Infinity)
      .countRelations()
      .withPopulateOverride(getPopulateForLocalizations(typedUid))
      .build();

    const { locale: resolvedLocale } = await getDocumentLocaleAndStatus({ locale }, uid);

    const isLocalized = isContentTypeLocalized(strapi, uid);

    const localeForQuery = isLocalized === true ? resolvedLocale : undefined;

    const documentLocales = await documentManager.findLocales(undefined, typedUid, {
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

    const deletedEntity = await documentManager.delete(documentLocales[0].documentId, typedUid, {
      locale: localeForQuery,
    });

    const sanitizedResult = await permissionChecker.sanitizeOutput(deletedEntity);

    return ok({ data: sanitizedResult } as Record<string, unknown>);
  };

/**
 * Creates a handler for publishing the single-type document draft.
 * Enforces RBAC publish permission; throws NotFound when the draft is missing.
 */
export const createSinglePublishHandler =
  (uid: UID.SingleType) =>
  (strapi: Core.Strapi, context: Modules.MCP.McpHandlerContext) =>
  async ({ args }: { args: SingleLocaleArgs }): Promise<Modules.MCP.McpToolHandlerReturn> => {
    const { userAbility } = context;
    const { locale } = args;
    // TODO: fix UID.SingleType assignability in @strapi/types
    const typedUid = uid as UID.ContentType;

    const documentManager = getService('document-manager');
    const permissionChecker = getService('permission-checker').create({
      userAbility,
      model: uid as string,
    });

    if (permissionChecker.cannot.publish()) {
      throw new errors.ForbiddenError();
    }

    const publishedDocument = await strapi.db.transaction(async () => {
      const sanitizedQuery = await permissionChecker.sanitizedQuery.publish({ locale });
      const { locale: resolvedLocale } = await getDocumentLocaleAndStatus({ locale }, uid);

      const publishFindQuery: McpDocumentQuery = {
        ...sanitizedQuery,
        locale: resolvedLocale,
        status: 'draft',
      };
      const document = await getService('document-manager')
        .findMany(publishFindQuery as McpFindManyParams, typedUid)
        .then((docs: any[]) => docs[0]);

      if (!document) {
        throw new errors.NotFoundError(MCP_NOT_FOUND_DOCUMENT);
      }

      if (permissionChecker.cannot.publish(document)) {
        throw new errors.ForbiddenError();
      }

      const publishResult = await documentManager.publish(document.documentId, typedUid, {
        locale: resolvedLocale,
      });

      return publishResult?.at(0);
    });

    const sanitizedDocument = await permissionChecker.sanitizeOutput(publishedDocument);
    const result = await formatDocumentWithMetadata(permissionChecker, typedUid, sanitizedDocument);

    return ok(result as Record<string, unknown>);
  };

/**
 * Creates a handler for unpublishing the single-type document.
 * Optionally discards the draft in the same transaction when `discardDraft` is true.
 * Enforces RBAC unpublish (and discard) permission.
 */
export const createSingleUnpublishHandler =
  (uid: UID.SingleType) =>
  (strapi: Core.Strapi, context: Modules.MCP.McpHandlerContext) =>
  async ({ args }: { args: SingleUnpublishArgs }): Promise<Modules.MCP.McpToolHandlerReturn> => {
    const { userAbility } = context;
    const { locale, discardDraft } = args;
    // TODO: fix UID.SingleType assignability in @strapi/types
    const typedUid = uid as UID.ContentType;

    const documentManager = getService('document-manager');
    const permissionChecker = getService('permission-checker').create({
      userAbility,
      model: uid as string,
    });

    if (permissionChecker.cannot.unpublish()) {
      throw new errors.ForbiddenError();
    }

    if (discardDraft === true && permissionChecker.cannot.discard()) {
      throw new errors.ForbiddenError();
    }

    const sanitizedQuery = await permissionChecker.sanitizedQuery.unpublish({ locale });
    const { locale: resolvedLocale } = await getDocumentLocaleAndStatus({ locale }, uid);

    const unpublishFindQuery: McpDocumentQuery = { ...sanitizedQuery, locale: resolvedLocale };
    const document = await getService('document-manager')
      .findMany(unpublishFindQuery as McpFindManyParams, typedUid)
      .then((docs: any[]) => docs[0]);

    if (!document) {
      throw new errors.NotFoundError(MCP_NOT_FOUND_DOCUMENT);
    }

    if (permissionChecker.cannot.unpublish(document)) {
      throw new errors.ForbiddenError();
    }

    if (discardDraft === true && permissionChecker.cannot.discard(document)) {
      throw new errors.ForbiddenError();
    }

    const result = await strapi.db.transaction(async () => {
      if (discardDraft === true) {
        await documentManager.discardDraft(document.documentId, typedUid, {
          locale: resolvedLocale,
        });
      }

      return asyncPipe.pipe(
        (doc: any) =>
          documentManager.unpublish(doc.documentId, typedUid, { locale: resolvedLocale }),
        permissionChecker.sanitizeOutput,
        (doc: any) => formatDocumentWithMetadata(permissionChecker, typedUid, doc)
      )(document);
    });

    return ok(result as Record<string, unknown>);
  };

/**
 * Creates a handler for discarding the draft of the single-type document.
 * Restores the published version as the draft. Enforces RBAC discard permission.
 */
export const createSingleDiscardDraftHandler =
  (uid: UID.SingleType) =>
  (_strapi: Core.Strapi, context: Modules.MCP.McpHandlerContext) =>
  async ({ args }: { args: SingleLocaleArgs }): Promise<Modules.MCP.McpToolHandlerReturn> => {
    const { userAbility } = context;
    const { locale } = args;
    // TODO: fix UID.SingleType assignability in @strapi/types
    const typedUid = uid as UID.ContentType;

    const documentManager = getService('document-manager');
    const permissionChecker = getService('permission-checker').create({
      userAbility,
      model: uid as string,
    });

    if (permissionChecker.cannot.discard()) {
      throw new errors.ForbiddenError();
    }

    const sanitizedQuery = await permissionChecker.sanitizedQuery.discard({ locale });
    const { locale: resolvedLocale } = await getDocumentLocaleAndStatus({ locale }, uid);

    const discardFindQuery: McpDocumentQuery = {
      ...sanitizedQuery,
      locale: resolvedLocale,
      status: 'published',
    };
    const document = await getService('document-manager')
      .findMany(discardFindQuery as McpFindManyParams, typedUid)
      .then((docs: any[]) => docs[0]);

    if (!document) {
      throw new errors.NotFoundError(MCP_NOT_FOUND_DOCUMENT);
    }

    if (permissionChecker.cannot.discard(document)) {
      throw new errors.ForbiddenError();
    }

    const discardedDocument = await asyncPipe.pipe(
      (doc: any) =>
        documentManager.discardDraft(doc.documentId, typedUid, { locale: resolvedLocale }),
      permissionChecker.sanitizeOutput,
      (doc: any) => formatDocumentWithMetadata(permissionChecker, typedUid, doc)
    )(document);

    return ok(discardedDocument as Record<string, unknown>);
  };
