import { contentTypes as contentTypesUtils, deniesAll, errors } from '@strapi/utils';
import type { Struct, UID } from '@strapi/types';
import type Koa from 'koa';

type Locale = string | string[] | undefined;
type Status = 'draft' | 'published';

/** What `resolveWriteStatus` gave for a write */
export interface ResolvedStatus {
  status: Status | undefined;
  publishAfterCreate: boolean;
}

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

const queryOf = (ctx: Koa.Context) => (ctx.query ?? {}) as Record<string, unknown>;

/** The `locale` of the request as it came: a list and `'*'` name several locales to check */
export const localeOf = (ctx: Koa.Context) => queryOf(ctx).locale as Locale;

/** A `locale` that names one locale, or nothing: a list, `'*'` and `''` name none */
const oneLocale = (locale: unknown) =>
  typeof locale === 'string' && locale !== '' && locale !== '*' ? locale : undefined;

/**
 * The write helpers of the core controllers, for one content type. Every one of them does nothing
 * for a caller whose ability is not subject-aware (API tokens, Users & Permissions), so those
 * callers get exactly what they get without them.
 */
export const createWriteGuard = (contentType: Struct.ContentTypeSchema) => {
  const uid = contentType.uid as UID.ContentType;
  const hasDraftAndPublish = contentTypesUtils.hasDraftAndPublish(contentType);

  const authOf = (ctx: Koa.Context) => ctx.state?.auth;

  const isSubjectAware = (ctx: Koa.Context) =>
    strapi.contentAPI.permissions.isSubjectAware(authOf(ctx));

  /**
   * Refuses (403) a create to a caller whose `create` rows give no entry: an empty body would
   * otherwise make an entry with no owner (Public under `is-owner`, which has no one to set).
   * Without a `create` row the route's permission is all there is, and the create goes ahead.
   */
  const assertCanCreate = (ctx: Koa.Context) => {
    const { permissions } = strapi.contentAPI;

    if (!permissions.isSubjectAware(authOf(ctx))) {
      return;
    }

    if (deniesAll(permissions.checker.filtersFor(authOf(ctx), 'create', uid))) {
      throw new errors.ForbiddenError();
    }
  };

  /**
   * Resolves the status the write gets and puts it in the query's `status`, which every later step
   * reads: run it before `validateQuery` and `sanitizeQuery`, so the drafts gate sees a write that
   * is a draft as one (a related type's drafts are not populated unchecked for it).
   */
  const resolveStatus = async (
    ctx: Koa.Context,
    opts: { documentId?: string; locale?: Locale }
  ): Promise<ResolvedStatus> => {
    const query = queryOf(ctx);
    const requested = query.status as Status | undefined;

    const resolved = await strapi.contentAPI.permissions.resolveWriteStatus(authOf(ctx), uid, {
      requested,
      ...opts,
    });

    // Left as it came when nothing changed: a caller that is not subject-aware sends its own query
    if (resolved.status !== requested) {
      query.status = resolved.status;
    }

    return resolved;
  };

  /** The status to hand the service, or nothing when the request's own stands */
  const statusParam = (ctx: Koa.Context, resolved: ResolvedStatus) =>
    resolved.status !== undefined && isSubjectAware(ctx) ? { status: resolved.status } : {};

  /** Whether an update with this resolved status goes on to publish */
  const publishes = (ctx: Koa.Context, resolved: ResolvedStatus) =>
    hasDraftAndPublish && resolved.status === 'published' && isSubjectAware(ctx);

  /**
   * Whether an update of the document would create the entry of its locale, as the Document
   * Service does when the document has none there. A list or `'*'` adds no locale, and a type that
   * is not localized has none to add.
   */
  const addsLocale = async (ctx: Koa.Context, documentId: string) => {
    const locale = localeOf(ctx);

    if (
      !isSubjectAware(ctx) ||
      !strapi.localization.isLocalizedContentType(contentType) ||
      locale === '*' ||
      Array.isArray(locale) ||
      (locale !== undefined && typeof locale !== 'string')
    ) {
      return false;
    }

    const stored = await strapi.documents(uid).count({
      filters: { documentId } as never,
      ...(hasDraftAndPublish ? { status: 'draft' as const } : {}),
      ...(locale === undefined ? {} : { locale }),
    });

    return stored === 0;
  };

  /**
   * The write takes the create path, so the create stamp applies (the owner is set to the caller).
   * The input steps read it from the context, where a controller that overrides them still finds it.
   */
  const markCreates = (ctx: Koa.Context) => {
    ctx.state ??= {};
    ctx.state.createsEntry = true;
  };

  /**
   * The core handler that runs (`create` or `update`), for the input steps: the owner stamp, the
   * refusal of an owner in the body and the locks key off it, not off the route's handler name, so
   * a custom-named route calling the core `create` or `update` gets them as well. Subject-aware
   * callers only: registered sanitizers of API tokens and Users & Permissions see the route's
   * action, as they do today.
   */
  const markInputAction = (ctx: Koa.Context, action: 'create' | 'update') => {
    if (!isSubjectAware(ctx)) {
      return;
    }

    ctx.state ??= {};
    ctx.state.inputAction = action;
  };

  /**
   * Judges the data a create or update wrote against the caller's conditions for the action (see
   * `permissions.assertWritten`): call it inside the transaction that wrote, after the write, and
   * never catch around it. The written version is the entity's locale (the request's one locale
   * when `fields` left it out) and the draft; a write that publishes is judged on the published
   * version as well. Nothing for a caller that is not subject-aware.
   */
  const assertWritten = async (
    ctx: Koa.Context,
    action: 'create' | 'update',
    written: any,
    query: Record<string, unknown>,
    resolved: ResolvedStatus
  ) => {
    if (!isSubjectAware(ctx)) {
      return;
    }

    const locale =
      typeof written?.locale === 'string'
        ? written.locale
        : oneLocale(query.locale ?? localeOf(ctx));
    const statuses = writtenStatuses(hasDraftAndPublish, resolved.status);

    for (const status of statuses) {
      await strapi.contentAPI.permissions.assertWritten(
        authOf(ctx),
        action,
        uid,
        written?.documentId,
        { locale, status }
      );
    }
  };

  /**
   * Publishes a draft the caller just wrote (created, or updated under a conditioned `publish`)
   * when their conditioned `publish` row matches it as written, and answers with the published
   * version when it did (read as the request asked: `fields` and `populate`), the draft otherwise.
   */
  const publishCreated = async (
    ctx: Koa.Context,
    entity: any,
    query: Record<string, unknown>,
    read: (documentId: string, params: Record<string, unknown>) => Promise<unknown>
  ) => {
    const documentId = entity?.documentId;
    // The locale of the version written: the entity's, or the request's one locale when `fields`
    // left it out of the entity (the default locale only when the request names none)
    const locale =
      typeof entity?.locale === 'string' ? entity.locale : oneLocale(query.locale ?? localeOf(ctx));

    if (typeof documentId !== 'string') {
      return entity;
    }

    const { permissions } = strapi.contentAPI;

    if (!(await permissions.publishIfAllowed(authOf(ctx), uid, documentId, { locale }))) {
      return entity;
    }

    const published = await read(documentId, {
      ...(query.fields === undefined ? {} : { fields: query.fields }),
      ...(query.populate === undefined ? {} : { populate: query.populate }),
      ...(locale === undefined ? {} : { locale }),
      status: 'published',
    });

    return published ?? entity;
  };

  return {
    isSubjectAware,
    assertCanCreate,
    resolveStatus,
    statusParam,
    publishes,
    addsLocale,
    markCreates,
    markInputAction,
    assertWritten,
    publishCreated,
  };
};
