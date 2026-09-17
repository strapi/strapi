import { castArray, uniq } from 'lodash/fp';
import type { Core } from '@strapi/types';

import { getDefaultLocale, getModel, mergeChangeSets, type RelRef } from '../codec';
import {
  getService,
  hasDraftAndPublish,
  isBranchableContentType,
  isLocalizedContentType,
  type BranchRef,
} from '../utils';

type KoaCtx = any;

const isRelationAttribute = (schema: ReturnType<typeof getModel> | undefined, name: string) =>
  schema?.attributes?.[name]?.type === 'relation' &&
  typeof schema.attributes[name].target === 'string';

/** The branch's folded refs for `(model, documentId, locale, targetField)`, or `undefined` when untouched. */
const getOverlayRefs = async (
  branch: BranchRef,
  model: string,
  documentId: string,
  locale: string | null,
  targetField: string
): Promise<RelRef[] | undefined> => {
  const changes = getService('changes');
  const rows = (await changes.getForDocuments(branch.chain, model, [documentId])).filter(
    (row) => row.operation === 'update'
  );
  if (rows.length === 0) {
    return undefined;
  }
  const ordered = changes.orderForFolding(rows, branch.chain, locale);
  const merged = mergeChangeSets(ordered.map((row) => row.changes));
  if (!(targetField in merged)) {
    return undefined;
  }
  return castArray((merged[targetField] as RelRef[] | RelRef | null) ?? []).filter(
    (ref): ref is RelRef => !!ref && typeof ref.documentId === 'string'
  );
};

const resolveLocale = async (schema: ReturnType<typeof getModel>, raw: unknown) => {
  if (!isLocalizedContentType(schema)) {
    return null;
  }
  return typeof raw === 'string' && raw ? raw : getDefaultLocale();
};

const getMainField = (targetUid: string): string | null => {
  try {
    const configuration = strapi
      .plugin('content-manager')
      .service('content-types')
      .findConfiguration(strapi.getModel(targetUid as never));
    const mainField = configuration?.settings?.mainField;
    if (
      typeof mainField === 'string' &&
      mainField !== 'id' &&
      getModel(targetUid).attributes[mainField]
    ) {
      return mainField;
    }
  } catch {
    // no configuration yet
  }
  return null;
};

/**
 * `GET /content-manager/relations/:model/:id/:targetField` reads the source
 * row's join table. On a branch whose delta touches that field, the answer is
 * rebuilt from the delta in the same shape the admin expects.
 */
const createFindExistingOverlay =
  (strapi: Core.Strapi) => async (ctx: KoaCtx, next: () => Promise<any>) => {
    await next();

    const branch = ctx.state?.branch as BranchRef | undefined;
    if (!branch || ctx.method !== 'GET' || !ctx.body?.results) {
      return;
    }
    const { model, id, targetField } = ctx.params;
    const query = ctx.request.query ?? {};
    if (query.status === 'published') {
      return;
    }
    const sourceSchema = strapi.getModel(model) as ReturnType<typeof getModel> | undefined;
    if (
      !sourceSchema ||
      sourceSchema.modelType !== 'contentType' ||
      !isBranchableContentType(sourceSchema)
    ) {
      return;
    }
    if (!isRelationAttribute(sourceSchema, targetField)) {
      return;
    }

    const locale = await resolveLocale(sourceSchema, query.locale);
    const refs = await getOverlayRefs(branch, model, id, locale, targetField);
    if (refs === undefined) {
      return;
    }

    const targetUid = sourceSchema.attributes[targetField].target as string;
    const targetSchema = getModel(targetUid);
    const targetLocalized = isLocalizedContentType(targetSchema);
    const targetDraftAndPublish = hasDraftAndPublish(targetSchema);
    const mainField = getMainField(targetUid);

    // The admin renders the list reversed, so the endpoint answers newest-first.
    const ordered = [...refs].reverse();
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.max(1, Number(query.pageSize) || 10);
    const total = ordered.length;
    const slice = ordered.slice((page - 1) * pageSize, page * pageSize);

    const select = uniq([
      'id',
      'documentId',
      'locale',
      'publishedAt',
      'updatedAt',
      ...(mainField ? [mainField] : []),
    ]);
    const rows: Array<Record<string, unknown> & { documentId: string; locale?: string | null }> =
      slice.length === 0
        ? []
        : await strapi.db.query(targetUid as never).findMany({
            where: {
              documentId: { $in: uniq(slice.map((ref) => ref.documentId)) },
              ...(targetDraftAndPublish ? { publishedAt: null } : {}),
            },
            select,
          });
    const keyOf = (documentId: string, refLocale: string | null | undefined) =>
      targetLocalized ? `${documentId}:${refLocale ?? ''}` : documentId;
    const byKey = new Map(rows.map((row) => [keyOf(row.documentId, row.locale), row]));

    let results = slice
      .map((ref) => byKey.get(keyOf(ref.documentId, ref.locale)))
      .filter((row): row is (typeof rows)[number] => row !== undefined);

    if (targetDraftAndPublish && results.length > 0) {
      const published: Array<
        Record<string, unknown> & { documentId: string; locale?: string | null }
      > = await strapi.db.query(targetUid as never).findMany({
        where: {
          documentId: { $in: uniq(results.map((row) => row.documentId)) },
          publishedAt: { $notNull: true },
        },
        select: ['id', 'documentId', 'locale', 'publishedAt', 'updatedAt', 'createdAt'],
      });
      const publishedByKey = new Map(
        published.map((row) => [keyOf(row.documentId, row.locale), row])
      );
      const metadata = strapi.plugin('content-manager').service('document-metadata');
      results = results.map((row) => {
        const counterpart = publishedByKey.get(keyOf(row.documentId, row.locale));
        return { ...row, status: metadata.getStatus(row, counterpart ? [counterpart] : []) };
      });
    } else {
      results = results.map((row) => ({ ...row, status: 'published' }));
    }

    ctx.body = {
      results,
      pagination: { page, pageSize, pageCount: Math.ceil(total / pageSize), total },
    };
  };

/**
 * `GET /content-manager/relations/:model/:targetField` excludes what main's
 * join table already links. On a branch the delta is the truth: targets
 * connected on the branch are omitted, targets disconnected on the branch
 * are offered again.
 */
const createFindAvailableShim =
  (strapi: Core.Strapi) => async (ctx: KoaCtx, next: () => Promise<any>) => {
    const branch = ctx.state?.branch as BranchRef | undefined;
    const query = ctx.request.query ?? {};
    const { model, targetField } = ctx.params;
    const sourceSchema = strapi.getModel(model) as ReturnType<typeof getModel> | undefined;

    if (
      !branch ||
      !query.id ||
      !sourceSchema ||
      sourceSchema.modelType !== 'contentType' ||
      !isBranchableContentType(sourceSchema) ||
      !isRelationAttribute(sourceSchema, targetField)
    ) {
      return next();
    }

    const locale = await resolveLocale(sourceSchema, query.locale);
    const refs = await getOverlayRefs(branch, model, String(query.id), locale, targetField);
    if (refs === undefined) {
      return next();
    }

    const targetUid = sourceSchema.attributes[targetField].target as string;
    const targetSchema = getModel(targetUid);
    const targetLocalized = isLocalizedContentType(targetSchema);
    const targetDraftAndPublish = hasDraftAndPublish(targetSchema);
    const keyOf = (documentId: string, refLocale: string | null | undefined) =>
      targetLocalized ? `${documentId}:${refLocale ?? ''}` : documentId;

    // Rows the branch links → omit.
    const linked: Array<{ id: number; documentId: string; locale?: string | null }> =
      refs.length === 0
        ? []
        : await strapi.db.query(targetUid as never).findMany({
            where: {
              documentId: { $in: uniq(refs.map((ref) => ref.documentId)) },
              ...(targetDraftAndPublish ? { publishedAt: null } : {}),
            },
            select: ['id', 'documentId', 'locale'],
          });
    const wanted = new Set(refs.map((ref) => keyOf(ref.documentId, ref.locale)));
    const omit = linked
      .filter((row) => wanted.has(keyOf(row.documentId, row.locale)))
      .map((row) => row.id);

    // Rows main links but the branch disconnected → include again.
    const sourceRow: { id: number } | null = await strapi.db.query(model).findOne({
      where: {
        documentId: String(query.id),
        ...(locale ? { locale } : {}),
        ...(hasDraftAndPublish(sourceSchema) ? { publishedAt: null } : {}),
      },
      select: ['id'],
    });
    let include: number[] = [];
    if (sourceRow) {
      const mainLinked = castArray(
        (await strapi.db.query(model).load(
          sourceRow as never,
          targetField as never,
          {
            select: ['id', 'documentId', 'locale'],
          } as never
        )) ?? []
      ) as Array<{ id: number; documentId: string; locale?: string | null }>;
      include = mainLinked
        .filter((row) => !wanted.has(keyOf(row.documentId, row.locale)))
        .map((row) => row.id);
    }

    ctx.request.query = {
      ...query,
      idsToOmit: uniq([...castArray(query.idsToOmit ?? []), ...omit.map(String)]),
      idsToInclude: uniq([...castArray(query.idsToInclude ?? []), ...include.map(String)]),
    };

    return next();
  };

/**
 * Appends the shims to the Content Manager's own route definitions. Routes are
 * composed at listen time, after bootstrap, so the extra middlewares are picked
 * up; they run after the CM's auth and RBAC policies and around its handler.
 */
export const registerRelationShims = (strapi: Core.Strapi) => {
  const contentManager = strapi.plugin('content-manager');
  const routes: any[] = (contentManager as any)?.routes?.admin?.routes ?? [];

  const attach = (
    handler: string,
    middleware: (ctx: KoaCtx, next: () => Promise<any>) => Promise<any>
  ) => {
    const route = routes.find((candidate) => candidate.handler === handler);
    if (!route) {
      return;
    }
    route.config = route.config ?? {};
    route.config.middlewares = [...(route.config.middlewares ?? []), middleware];
  };

  attach('relations.findExisting', createFindExistingOverlay(strapi));
  attach('relations.findAvailable', createFindAvailableShim(strapi));
};
