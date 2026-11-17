import { contentTypes, deniesAll, errors, validate } from '@strapi/utils';
import type { Core, Struct, UID } from '@strapi/types';

import { selectionPopulate } from './selection-populate';

type Status = 'draft' | 'published';

/**
 * A string argument as the Content API helpers read it. GraphQL gives `null` for an argument the
 * client sent as `null`, which `entryMatches` takes for a locale it can't place (a 404), so a
 * `null` or an empty string is no value at all.
 */
export const stringArg = (value: unknown): string | undefined =>
  typeof value === 'string' && value !== '' ? value : undefined;

/** The publication status a mutation asked for, when it is one (GraphQL sends `null` for none) */
export const statusArg = (value: unknown): Status | undefined =>
  value === 'draft' || value === 'published' ? value : undefined;

/**
 * Whether the caller's ability carries subject-aware permissions (end users). Every step of the
 * Content API permission engine that GraphQL adds sits behind it, so tokens and Users &
 * Permissions get what they got before.
 */
export const isSubjectAware = (strapi: Core.Strapi, context: unknown): boolean =>
  strapi.contentAPI.permissions.isSubjectAware(
    (context as { state?: { auth?: unknown } } | undefined)?.state?.auth
  );

/**
 * The status and locale an output was read in, which the field rules need to ask about an entry in
 * the version and locale it is. A localized type that names no locale is read in the
 * default locale; a `locale` of `'*'` stands for several and places no entry.
 */
export const getOutputScope = async (
  strapi: Core.Strapi,
  contentType: Struct.Schema,
  request: { status?: unknown; locale?: unknown }
) => {
  const scope: { status?: Status; locale?: string } = {};

  if (request.status === 'draft' || request.status === 'published') {
    scope.status = request.status;
  }

  const locale = stringArg(request.locale);

  if (locale !== undefined) {
    scope.locale = locale;
  } else if (strapi.localization?.isLocalizedContentType(contentType)) {
    const defaultLocale = await strapi.localization.getDefaultLocale();

    if (typeof defaultLocale === 'string') {
      scope.locale = defaultLocale;
    }
  }

  return scope;
};

/**
 * The versions a write leaves that are judged: the draft of a draft & publish type, and the
 * published version too when the write publishes. The only version of a type without it has no status.
 */
const writtenStatuses = (
  hasDraftAndPublish: boolean,
  status: Status | undefined
): Array<Status | undefined> => {
  if (!hasDraftAndPublish) {
    return [undefined];
  }

  return status === 'published' ? ['draft', 'published'] : ['draft'];
};

/** What the nested resolvers of a mutation's response read their relations in */
export interface WriteScope {
  status: Status;
}

/**
 * Remembers the version a mutation returned, by the response key of its root field, so the
 * association resolver reads the relations of the response the way a query's do (the drafts gate
 * included) instead of unfiltered. A type without draft & publish is read as published.
 */
export const recordWriteScope = (
  context: { writeScopeByPath?: Map<string | number, WriteScope> },
  info: { path?: { key?: string | number } } | undefined,
  contentType: Struct.ContentTypeSchema,
  entity: unknown
) => {
  const key = info?.path?.key;

  if (key === undefined) {
    return;
  }

  const isDraft =
    contentTypes.hasDraftAndPublish(contentType) &&
    !(entity as { publishedAt?: unknown } | null | undefined)?.publishedAt;

  context.writeScopeByPath ??= new Map();
  context.writeScopeByPath.set(key, { status: isDraft ? 'draft' : 'published' });
};

/**
 * The write helpers of the GraphQL mutations for one content type: what the core controllers'
 * write guard does for REST (`@strapi/core` `core-api/controller/write-guard.ts`), built on the
 * same `strapi.contentAPI.permissions` utilities. The caller checks `isSubjectAware` first.
 */
export const createWriteGuard = (strapi: Core.Strapi, contentType: Struct.ContentTypeSchema) => {
  const uid = contentType.uid as UID.ContentType;
  const hasDraftAndPublish = contentTypes.hasDraftAndPublish(contentType);

  /**
   * Refuses (403) a create to a caller whose `create` rows give no entry: an empty body would
   * otherwise make an entry with no owner. Without a `create` row the route's permission is all
   * there is, and the create goes ahead.
   */
  const assertCanCreate = (auth: unknown) => {
    const { permissions } = strapi.contentAPI;

    if (deniesAll(permissions.checker.filtersFor(auth, 'create', uid))) {
      throw new errors.ForbiddenError();
    }
  };

  /**
   * Whether an update of the document would create the entry of its locale, as the Document
   * Service does when the document has none there. `'*'` adds no locale, and a type that is not
   * localized has none to add.
   */
  const addsLocale = async (documentId: string, locale: string | undefined) => {
    if (!strapi.localization.isLocalizedContentType(contentType) || locale === '*') {
      return false;
    }

    const stored = await strapi.documents(uid).count({
      filters: { documentId } as never,
      ...(hasDraftAndPublish ? { status: 'draft' as const } : {}),
      ...(locale === undefined ? {} : { locale }),
    });

    return stored === 0;
  };

  /** Whether an update with this resolved status goes on to publish */
  const publishes = (resolved: { status: Status | undefined }) =>
    hasDraftAndPublish && resolved.status === 'published';

  /**
   * Judges the data a create or update wrote against the caller's conditions for the action (see
   * `permissions.assertWritten`): call it inside the transaction that wrote, after the write, and
   * never catch around it. The written version is the entity's locale (the request's one when the
   * entity has none) and the draft; a write that publishes is judged on the published version as
   * well.
   */
  const assertWritten = async (
    auth: unknown,
    action: 'create' | 'update',
    written: any,
    locale: string | undefined,
    resolved: { status: Status | undefined }
  ) => {
    const writtenLocale = typeof written?.locale === 'string' ? written.locale : locale;
    const statuses = writtenStatuses(hasDraftAndPublish, resolved.status);

    for (const status of statuses) {
      await strapi.contentAPI.permissions.assertWritten(auth, action, uid, written?.documentId, {
        locale: writtenLocale,
        status,
      });
    }
  };

  /**
   * Publishes a draft the caller just wrote (created, or updated under a conditioned `publish`)
   * when their conditioned `publish` row matches it as written, and answers with the published
   * version when it did, the draft otherwise.
   */
  const publishCreated = async (auth: unknown, entity: any, locale: string | undefined) => {
    const documentId = entity?.documentId;
    const entityLocale = typeof entity?.locale === 'string' ? entity.locale : locale;

    if (typeof documentId !== 'string') {
      return entity;
    }

    const { permissions } = strapi.contentAPI;

    if (!(await permissions.publishIfAllowed(auth, uid, documentId, { locale: entityLocale }))) {
      return entity;
    }

    const published = await strapi.documents(uid).findOne({
      documentId,
      status: 'published',
      ...(entityLocale === undefined ? {} : { locale: entityLocale }),
    });

    return published ?? entity;
  };

  /**
   * Refuses (403 `DRAFT_READ_FORBIDDEN`) a write whose response selects relations of a draft &
   * publish type the caller may not read drafts of, before anything is written: the
   * response's relations are read in the status the write resolved to, as REST's populate is, and
   * REST's drafts gate refuses that populate before its write too. The written type itself is not
   * gated (a write returns what it wrote).
   */
  const assertSelectionDrafts = async (
    auth: unknown,
    status: Status | undefined,
    info: Parameters<typeof selectionPopulate>[2]
  ) => {
    const populate = selectionPopulate(strapi, contentType, info);

    if (Object.keys(populate).length === 0) {
      return;
    }

    await validate.assertDraftAccess(
      { populate, ...(status === undefined ? {} : { status }) },
      contentType as never,
      {
        auth,
        checker: strapi.contentAPI.permissions.checker,
        getModel: (modelUid: string) => strapi.getModel(modelUid as never) as never,
        skipRoot: true,
      }
    );
  };

  return {
    assertCanCreate,
    addsLocale,
    publishes,
    assertWritten,
    publishCreated,
    assertSelectionDrafts,
  };
};
