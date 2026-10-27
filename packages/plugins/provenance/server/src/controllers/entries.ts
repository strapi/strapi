import { contentTypes, errors } from '@strapi/utils';

import type { Core } from '@strapi/types';
import type { Context } from 'koa';

import { resolveBaseDeclaration } from '../domain/declaration';
import { getPermissionPaths, isTrackedContentType, type Schema } from '../domain/fields';
import { hashValue } from '../domain/hash';
import { toDigitalSourceType } from '../domain/iptc';
import { isAiSource } from '../domain/transitions';
import { getService } from '../utils';

import { toPublicView, type FieldView, type Status, type Target } from '../services/provenance';

const parseStatus = (value: unknown, hasDraftAndPublish: boolean): Status => {
  if (!hasDraftAndPublish) {
    return 'published';
  }

  return value === 'published' ? 'published' : 'draft';
};

const parseFields = (value: unknown, tracked: string[]) => {
  if (value === undefined) {
    return tracked;
  }

  if (!Array.isArray(value) || value.some((field) => typeof field !== 'string')) {
    throw new errors.ValidationError('"fields" must be an array of attribute names');
  }

  const unknown = value.filter((field) => !tracked.includes(field));

  if (unknown.length > 0) {
    throw new errors.ValidationError(
      `Fields you cannot change, or without tracked provenance: ${unknown.join(', ')}`
    );
  }

  return value as string[];
};

/**
 * Resolves the entry a request targets and loads its tracked values.
 */
const loadEntry = async (
  strapi: Core.Strapi,
  {
    uid,
    documentId,
    locale,
    status,
    extraFields = [],
  }: {
    uid: string;
    documentId: string;
    locale?: unknown;
    status?: unknown;
    extraFields?: string[];
  }
) => {
  const contentType = strapi.contentTypes[uid as keyof typeof strapi.contentTypes];

  if (contentType === undefined || !isTrackedContentType(uid)) {
    throw new errors.NotFoundError('Content type not found');
  }

  const hasDraftAndPublish = contentTypes.hasDraftAndPublish(contentType);
  const resolvedStatus = parseStatus(status, hasDraftAndPublish);
  const values = getService(strapi, 'values');
  const tracked = values.getTracked(uid);

  const entry = await values.read(
    {
      uid,
      documentId,
      locale: typeof locale === 'string' && locale !== '' ? locale : null,
      status: resolvedStatus,
    },
    {
      extra: {
        // The locale identifies the entry provenance is stored for
        fields: ['locale' in contentType.attributes ? 'locale' : [], extraFields].flat(),
        // Permission conditions such as "is creator" read it
        populate: { createdBy: { fields: ['id'] } },
      },
    }
  );

  if (!entry) {
    throw new errors.NotFoundError('Entry not found');
  }

  const target: Target = {
    uid,
    // As stored: a case-insensitive database also finds the entry with another case
    documentId: entry.documentId as string,
    locale: (entry.locale as string | undefined) ?? null,
    status: resolvedStatus,
  };

  return { target, tracked, entry: entry as Record<string, unknown> };
};

type Action = 'read' | 'update';

type PermissionChecker = {
  can: Record<Action, (entity?: unknown, field?: string) => boolean>;
  cannot: Record<Action, (entity?: unknown) => boolean>;
  sanitizedQuery: Record<Action, (query: object) => Promise<Record<string, unknown>>>;
};

/**
 * The Content Manager permission checker of the current admin user for a content type, so
 * these routes follow the same rules as the edit view: conditions, locales and fields.
 */
const getPermissionChecker = (strapi: Core.Strapi, ctx: Context, uid: string) => {
  const checker = strapi
    .plugin('content-manager')
    .service('permission-checker')
    .create({ userAbility: ctx.state.userAbility, model: uid }) as PermissionChecker;

  if (checker.cannot[ctxAction(ctx)]()) {
    throw new errors.ForbiddenError();
  }

  return checker;
};

const ctxAction = (ctx: Context): Action => (ctx.method === 'GET' ? 'read' : 'update');

/**
 * Throws unless the user may act on this entry, and returns the tracked fields they may see
 * (read) or change (update).
 */
const permittedFields = (
  strapi: Core.Strapi,
  uid: string,
  checker: PermissionChecker,
  action: Action,
  entry: Record<string, unknown>,
  tracked: string[]
) => {
  if (checker.cannot[action](entry)) {
    throw new errors.ForbiddenError();
  }

  const schema = strapi.contentTypes[uid as never] as unknown as Schema;
  const getComponent = (componentUid: string) =>
    strapi.components[componentUid as never] as unknown as Schema | undefined;

  // A component is allowed when any field inside it is
  return tracked.filter((field) =>
    getPermissionPaths(schema, field, getComponent).some((path) => checker.can[action](entry, path))
  );
};

const pick = <T>(record: Record<string, T>, fields: string[]) =>
  Object.fromEntries(Object.entries(record).filter(([name]) => fields.includes(name)));

/**
 * Reviews and AI declarations speak for a person: an admin session, not a token or the MCP
 * server, even one acting for an admin user.
 */
const assertHumanSession = async (strapi: Core.Strapi) => {
  const snapshot = await getService(strapi, 'request').getSnapshot();

  if (snapshot?.strategy !== 'admin' || resolveBaseDeclaration(snapshot).origin !== 'human') {
    throw new errors.ForbiddenError('Only an admin user in the admin panel can do this');
  }
};

/**
 * Reviews and declarations apply to the draft: the published version gets them on publish.
 */
const parseWriteStatus = (value: unknown) => {
  if (value !== undefined && value !== 'draft') {
    throw new errors.ValidationError('Only the draft can be reviewed or declared');
  }

  return 'draft';
};

type NamedFieldView = Omit<FieldView, 'review'> & {
  review: (NonNullable<FieldView['review']> & { by: string | null }) | null;
};

const withReviewerNames = async (
  strapi: Core.Strapi,
  fields: Record<string, FieldView>
): Promise<Record<string, NamedFieldView>> => {
  const reviewerIds = [
    ...new Set(Object.values(fields).flatMap((field) => (field.review ? [field.review.byId] : []))),
  ];

  const reviewers =
    reviewerIds.length > 0
      ? await strapi.db.query('admin::user').findMany({
          select: ['id', 'firstname', 'lastname', 'username'],
          where: { id: { $in: reviewerIds } },
        })
      : [];

  const nameById = new Map<string, string>(
    reviewers.map((user: Record<string, any>) => [
      String(user.id),
      user.username || [user.firstname, user.lastname].filter(Boolean).join(' '),
    ])
  );

  return Object.fromEntries(
    Object.entries(fields).map(([name, field]) => [
      name,
      {
        ...field,
        review: field.review
          ? { ...field.review, by: nameById.get(field.review.byId) ?? null }
          : null,
      },
    ])
  );
};

export const createEntriesController = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Admin: provenance of every tracked field of an entry.
   */
  async find(ctx: Context) {
    const { uid, documentId } = ctx.params;

    const checker = getPermissionChecker(strapi, ctx, uid);
    const { target, tracked, entry } = await loadEntry(strapi, {
      uid,
      documentId,
      locale: ctx.query.locale,
      status: ctx.query.status,
    });
    const readable = permittedFields(strapi, uid, checker, 'read', entry, tracked);
    const fields = pick(
      await getService(strapi, 'provenance').getForEntry(target, entry),
      readable
    );

    ctx.body = {
      data: {
        locale: target.locale,
        status: target.status,
        fields: Object.fromEntries(
          Object.entries(await withReviewerNames(strapi, fields)).map(([name, field]) => [
            name,
            { ...field, digitalSourceType: toDigitalSourceType(field.source) },
          ])
        ),
        publishRequiresReview: await getService(strapi, 'settings').requiresReview(),
      },
    };
  },

  /**
   * Admin: the current user takes editorial responsibility for the current values.
   */
  async review(ctx: Context) {
    const { uid, documentId } = ctx.params;
    const body = (ctx.request.body ?? {}) as Record<string, unknown>;

    const checker = getPermissionChecker(strapi, ctx, uid);
    await assertHumanSession(strapi);

    const provenance = getService(strapi, 'provenance');

    // The review must be of the value as committed: lock, then read, then write
    const fields = await strapi.db.transaction(async () => {
      await provenance.lockDocument(uid, documentId);

      const { target, tracked, entry } = await loadEntry(strapi, {
        uid,
        documentId,
        locale: body.locale,
        status: parseWriteStatus(body.status),
      });
      const reviewed = parseFields(
        body.fields,
        permittedFields(strapi, uid, checker, 'update', entry, tracked)
      );

      await provenance.markReviewed({
        target,
        fields: reviewed,
        current: entry,
        userId: ctx.state.user.id,
      });
      await provenance.syncAcrossLocales(target, reviewed);

      return reviewed;
    });

    ctx.body = { data: { reviewed: fields } };
  },

  /**
   * Admin: AI field counts of the entries a list view shows, in one request.
   */
  async summary(ctx: Context) {
    const { uid } = ctx.params;

    const contentType = strapi.contentTypes[uid as keyof typeof strapi.contentTypes];

    if (contentType === undefined || !isTrackedContentType(uid)) {
      throw new errors.NotFoundError('Content type not found');
    }

    const checker = getPermissionChecker(strapi, ctx, uid);

    const { documentIds, locale } = ctx.query;

    if (typeof documentIds !== 'string' || documentIds === '') {
      throw new errors.ValidationError('"documentIds" is required');
    }

    const status = parseStatus('draft', contentTypes.hasDraftAndPublish(contentType));
    // Every content type has a `locale` attribute: the i18n option says whether it is used
    const localized =
      (contentType.pluginOptions as { i18n?: { localized?: boolean } } | undefined)?.i18n
        ?.localized === true;
    let resolvedLocale = typeof locale === 'string' && locale !== '' ? locale : undefined;

    // Count one locale, the one the list shows: other locales may not be readable
    if (localized && resolvedLocale === undefined) {
      resolvedLocale = await strapi.plugin('i18n')?.service('locales').getDefaultLocale();
    }

    // Only the entries the user may read, one list page at most
    const permissionQuery = await checker.sanitizedQuery.read({});
    const readable = (await strapi.documents(uid as any).findMany({
      filters: {
        $and: [
          permissionQuery.filters ?? {},
          { documentId: { $in: documentIds.split(',').slice(0, 100) } },
        ],
      },
      locale: resolvedLocale,
      status,
      fields: ['documentId'],
    } as any)) as Array<{ documentId: string }>;
    // And only the fields they may read
    const schema = contentType as unknown as Schema;
    const getComponent = (componentUid: string) =>
      strapi.components[componentUid as never] as unknown as Schema | undefined;
    const readableFields = getService(strapi, 'values')
      .getTracked(uid)
      .filter((field) =>
        getPermissionPaths(schema, field, getComponent).some((path) =>
          checker.can.read(undefined, path)
        )
      );

    ctx.body = {
      data:
        readable.length > 0
          ? await getService(strapi, 'provenance').summarize({
              uid,
              status,
              locale: localized ? (resolvedLocale ?? null) : undefined,
              documentIds: readable.map((entry) => entry.documentId),
              fields: readableFields,
            })
          : {},
    };
  },

  /**
   * Admin: proof of editorial responsibility for a version of an entry, the published one by
   * default. Each field gives its source with its IPTC term, the hash of its value and who
   * reviewed that exact value.
   */
  async export(ctx: Context) {
    const { uid, documentId } = ctx.params;

    if (!getService(strapi, 'settings').isGovernanceEnabled()) {
      throw new errors.ForbiddenError(
        'The proof export requires the AI governance license feature'
      );
    }

    const checker = getPermissionChecker(strapi, ctx, uid);
    const { target, tracked, entry } = await loadEntry(strapi, {
      uid,
      documentId,
      locale: ctx.query.locale,
      status: ctx.query.status ?? 'published',
      extraFields: ['publishedAt'],
    });
    const readable = permittedFields(strapi, uid, checker, 'read', entry, tracked);
    const fields = await withReviewerNames(
      strapi,
      pick(await getService(strapi, 'provenance').getForEntry(target, entry), readable)
    );
    const views = Object.values(fields);

    ctx.set(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(`provenance-${documentId}${target.locale ? `-${target.locale}` : ''}`)}.json"`
    );
    ctx.body = {
      format: 'strapi-provenance/1',
      generatedAt: new Date().toISOString(),
      entry: {
        uid,
        documentId,
        locale: target.locale,
        status: target.status,
        publishedAt: entry.publishedAt ?? null,
      },
      summary: {
        fields: views.length,
        ai: views.filter((field) => isAiSource(field.source)).length,
        aiReviewed: views.filter((field) => isAiSource(field.source) && field.review !== null)
          .length,
      },
      fields: Object.fromEntries(
        Object.entries(fields).map(([name, field]) => [
          name,
          {
            source: field.source,
            digitalSourceType: toDigitalSourceType(field.source),
            model: field.model,
            agent: field.agent,
            signal: field.signal,
            recordedAt: field.recordedAt,
            valueHash: hashValue(entry[name]),
            review: field.review
              ? {
                  reviewer: { id: field.review.byId, name: field.review.by },
                  reviewedAt: field.review.at,
                }
              : null,
            reviewOutdated: field.reviewOutdated,
          },
        ])
      ),
    };
  },

  /**
   * Admin: declares that fields contain AI output, for instance pasted from a chat assistant.
   */
  async declare(ctx: Context) {
    const { uid, documentId } = ctx.params;
    const body = (ctx.request.body ?? {}) as Record<string, unknown>;

    if (body.fields === undefined) {
      throw new errors.ValidationError('"fields" is required');
    }

    const checker = getPermissionChecker(strapi, ctx, uid);
    await assertHumanSession(strapi);

    const provenance = getService(strapi, 'provenance');

    // Lock, then read, then write: the declaration describes the value as committed
    const fields = await strapi.db.transaction(async () => {
      await provenance.lockDocument(uid, documentId);

      const { target, tracked, entry } = await loadEntry(strapi, {
        uid,
        documentId,
        locale: body.locale,
        status: parseWriteStatus(body.status),
      });
      const declared = parseFields(
        body.fields,
        permittedFields(strapi, uid, checker, 'update', entry, tracked)
      );

      await provenance.declareAi({
        target,
        fields: declared,
        current: entry,
        userId: ctx.state.user.id,
        edited: body.edited === true,
        model:
          typeof body.model === 'string' && body.model !== ''
            ? body.model.slice(0, 200)
            : undefined,
      });
      await provenance.syncAcrossLocales(target, declared);

      return declared;
    });

    ctx.body = { data: { declared: fields } };
  },

  /**
   * Content API: provenance of a published entry, for consumers that display AI labels.
   * Requires the right to read the entry itself, and exposes no actor identifiers.
   */
  async findPublished(ctx: Context) {
    const { uid, documentId } = ctx.params;

    if (!isTrackedContentType(uid) || strapi.contentTypes[uid as never] === undefined) {
      throw new errors.NotFoundError('Content type not found');
    }

    await strapi.auth.verify(ctx.state.auth, { scope: [`${uid}.findOne`] });

    const { target, entry } = await loadEntry(strapi, {
      uid,
      documentId,
      locale: ctx.query.locale,
      status: 'published',
    });
    const { attributes } = strapi.contentTypes[uid as never] as unknown as {
      attributes: Record<string, { private?: boolean }>;
    };
    const fields = Object.entries(
      await getService(strapi, 'provenance').getForEntry(target, entry)
    ).filter(([name]) => attributes[name]?.private !== true);

    ctx.body = {
      data: {
        documentId,
        locale: target.locale,
        fields: Object.fromEntries(fields.map(([name, field]) => [name, toPublicView(field)])),
      },
    };
  },
});
