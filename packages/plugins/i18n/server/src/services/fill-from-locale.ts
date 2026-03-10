import { isNil, isArray } from 'lodash/fp';
import { contentTypes } from '@strapi/utils';
import type { UID, Schema } from '@strapi/types';

const getMainFieldForModel = (targetUid: UID.Schema): string => {
  const model = strapi.getModel(targetUid);
  const firstString = Object.keys(model?.attributes || {}).find(
    (key) => model.attributes[key]?.type === 'string' && key !== 'id'
  );
  return firstString || 'id';
};

const getRelationLabel = (
  relation: { documentId: string; id: number | string; locale?: string },
  labelById: Map<number | string, unknown>
): string => {
  const value = labelById.get(relation.id);
  if (typeof value === 'string') return value;
  return relation.documentId;
};

const FIELDS_TO_REMOVE = [
  'createdAt',
  'createdBy',
  'updatedAt',
  'updatedBy',
  'id',
  'documentId',
  'publishedAt',
  'strapi_stage',
  'strapi_assignee',
  'locale',
  'status',
];

const STATUS_FIELDS = ['id', 'documentId', 'locale', 'updatedAt', 'publishedAt'];

/**
 * Add status to multiple relations in one batch (avoids N+1 queries).
 */
const addStatusToRelationsBatch = (
  targetUid: UID.Schema,
  relations: Array<{ documentId: string; id: number | string; locale?: string }>,
  allEntries: Array<{
    id: number | string;
    documentId: string;
    locale?: string;
    updatedAt?: unknown;
    publishedAt?: unknown;
  }>
): Array<{ documentId: string; id: number | string; locale?: string; status?: string }> => {
  const model = strapi.getModel(targetUid);
  if (!contentTypes.hasDraftAndPublish(model)) {
    return relations;
  }

  const documentMetadata = strapi.plugin('content-manager')?.service('document-metadata');
  if (!documentMetadata) {
    return relations;
  }

  const isLocalized = strapi
    .plugin('i18n')
    ?.service('content-types')
    ?.isLocalizedContentType(model);
  const groupKey = (e: { documentId: string; locale?: string }) =>
    isLocalized && e.locale ? `${e.documentId}:${e.locale}` : e.documentId;

  const byGroup = new Map<string, typeof allEntries>();
  for (const e of allEntries) {
    const key = groupKey(e);
    const list = byGroup.get(key) ?? [];
    list.push(e);
    byGroup.set(key, list);
  }

  return relations.map((relation) => {
    const key = groupKey(relation);
    const entries = byGroup.get(key) ?? [];
    if (!entries.length) return relation;

    const version = entries.find((e) => e.id === relation.id) ?? entries[0];
    const otherVersions = entries.filter((e) => e.id !== version.id);

    return {
      ...relation,
      status: documentMetadata.getStatus(version, otherVersions),
    };
  });
};

/**
 * Resolve relations for the target locale (batched to avoid N+1).
 */
const resolveRelationsForLocaleBatch = async (
  relations: Array<{ documentId: string; id?: number; locale?: string }>,
  targetUid: UID.Schema,
  targetLocale: string
): Promise<Array<{ documentId: string; id: number | string; locale?: string } | null>> => {
  const i18nContentTypesService = strapi.plugin('i18n')?.service('content-types');
  const isTargetLocalized = i18nContentTypesService?.isLocalizedContentType(
    strapi.getModel(targetUid)
  );

  if (!isTargetLocalized) {
    return relations.map((rel) => ({
      documentId: rel.documentId,
      id: rel.id ?? rel.documentId,
    }));
  }

  const documentIds = [...new Set(relations.map((r) => r.documentId))];
  const model = strapi.getModel(targetUid);
  const targetEntriesQuery: { where: object; select: string[]; orderBy?: Record<string, string> } =
    {
      where: { documentId: { $in: documentIds }, locale: targetLocale },
      select: STATUS_FIELDS,
    };
  if (contentTypes.hasDraftAndPublish(model)) {
    targetEntriesQuery.orderBy = { publishedAt: 'desc' };
  }
  const targetEntries = await strapi.db.query(targetUid).findMany(targetEntriesQuery);
  const byDocumentId = new Map<string, (typeof targetEntries)[0]>();
  for (const e of targetEntries) {
    byDocumentId.set(e.documentId, e);
  }

  return relations.map((rel) => {
    const entry = byDocumentId.get(rel.documentId);
    if (!entry) return null;
    return {
      documentId: entry.documentId,
      id: entry.id,
      locale: entry.locale,
    };
  });
};

/**
 * Transform relation value to { connect: [...], disconnect: [] } with relations resolved for target locale.
 */
const transformRelationsForLocale = async (
  value: unknown,
  attribute: Schema.Attribute.Relation,
  targetLocale: string
): Promise<{ connect: unknown[]; disconnect: unknown[] }> => {
  const attr = attribute as Schema.Attribute.Relation & { relation?: string; target?: string };
  if (attr.relation?.toLowerCase().includes('morph')) {
    return { connect: [], disconnect: [] };
  }

  const targetUid = attr.target as UID.Schema;
  if (!targetUid) {
    return { connect: [], disconnect: [] };
  }

  let relations: unknown[];
  if (isArray(value)) {
    relations = value;
  } else if (value) {
    relations = [value];
  } else {
    relations = [];
  }

  const validRels = relations.filter(
    (rel): rel is { documentId: string; id?: number; locale?: string } =>
      typeof rel === 'object' && rel !== null && 'documentId' in rel && !!rel.documentId
  );
  if (validRels.length === 0) {
    return { connect: [], disconnect: [] };
  }

  const resolved = await resolveRelationsForLocaleBatch(validRels, targetUid, targetLocale);
  const baseConnect = resolved
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .map((r, index) => ({ ...r, __temp_key__: `a${index}` }));

  if (baseConnect.length === 0) {
    return { connect: [], disconnect: [] };
  }

  const mainField = getMainFieldForModel(targetUid);
  const selectFields: string[] = ['documentId', 'id', 'locale', mainField];
  const i18nContentTypesService = strapi.plugin('i18n')?.service('content-types');
  const isTargetLocalized = i18nContentTypesService?.isLocalizedContentType(
    strapi.getModel(targetUid)
  );

  const documentIds = [...new Set(baseConnect.map((r) => r.documentId))];
  const where: { documentId?: { $in: string[] }; locale?: { $in: string[] } } = {
    documentId: { $in: documentIds },
  };
  if (isTargetLocalized) {
    const locales = [
      ...new Set(baseConnect.map((r) => r.locale).filter((l): l is string => Boolean(l))),
    ];
    if (locales.length) {
      where.locale = { $in: locales };
    }
  }

  const statusWhere: { documentId: { $in: string[] }; locale?: { $in: string[] } } = {
    documentId: { $in: documentIds },
  };
  if (isTargetLocalized && where.locale) {
    statusWhere.locale = where.locale;
  }

  const [allStatusEntries, labelEntries] = await Promise.all([
    contentTypes.hasDraftAndPublish(strapi.getModel(targetUid))
      ? strapi.db.query(targetUid).findMany({
          where: statusWhere,
          select: STATUS_FIELDS,
        })
      : Promise.resolve([]),
    strapi.db.query(targetUid).findMany({
      where,
      select: selectFields,
    }),
  ]);

  const withStatus = addStatusToRelationsBatch(targetUid, baseConnect, allStatusEntries);

  const labelById = new Map<number | string, unknown>();
  for (const entry of labelEntries) {
    labelById.set(entry.id, entry[mainField]);
  }

  const connect = withStatus.map((r) => ({
    ...r,
    [mainField]: labelById.get(r.id),
    label: getRelationLabel(r, labelById),
  }));

  return { connect, disconnect: [] };
};

/**
 * Recursively process document data: remove meta fields, resolve relations for target locale.
 */
const processDocumentData = async (
  data: Record<string, unknown>,
  schema: Schema.ContentType | Schema.Component,
  components: Record<string, Schema.Component>,
  targetLocale: string
): Promise<Record<string, unknown>> => {
  if (isNil(data)) {
    return data;
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (FIELDS_TO_REMOVE.includes(key)) {
      continue;
    }

    const attribute = schema?.attributes?.[key];
    if (!attribute) {
      result[key] = value;
      continue;
    }

    if (attribute.type === 'password') {
      continue;
    }

    if (attribute.type === 'relation') {
      result[key] = await transformRelationsForLocale(
        value,
        attribute as Schema.Attribute.Relation,
        targetLocale
      );
      continue;
    }

    if (attribute.type === 'component') {
      const compSchema = (components[attribute.component] || {
        attributes: {},
      }) as Schema.Component;
      if (attribute.repeatable && isArray(value)) {
        result[key] = await Promise.all(
          value.map(async (item: Record<string, unknown>, index: number) => {
            const processed = await processDocumentData(item, compSchema, components, targetLocale);
            return { ...processed, __temp_key__: index + 1 };
          })
        );
      } else if (value) {
        const processed = await processDocumentData(
          value as Record<string, unknown>,
          compSchema,
          components,
          targetLocale
        );
        result[key] = processed;
      } else {
        result[key] = value;
      }
      continue;
    }

    if (attribute.type === 'dynamiczone' && isArray(value)) {
      result[key] = await Promise.all(
        value.map(async (item: Record<string, unknown>, index: number) => {
          const compSchema = (components[item?.__component as string] || {
            attributes: {},
          }) as Schema.Component;
          const processed = await processDocumentData(item, compSchema, components, targetLocale);
          return { ...processed, __temp_key__: index + 1 };
        })
      );
      continue;
    }

    result[key] = value;
  }

  return result;
};

const fillFromLocale = () => {
  return {
    async getDataForLocale(
      model: UID.ContentType,
      documentId: string,
      sourceLocale: string,
      targetLocale: string
    ) {
      const populateBuilderService = strapi
        .plugin('content-manager')
        .service('populate-builder') as (uid: UID.ContentType) => {
        populateDeep: (level: number) => { build: () => Promise<unknown> };
      };
      const modelDef = strapi.getModel(model);

      if (!modelDef) {
        throw new Error(`Model ${model} not found`);
      }

      // Build populate WITHOUT countRelations so we get full relation objects
      const populate = await populateBuilderService(model).populateDeep(Infinity).build();

      // Single query: prefer published, fall back to draft (orderBy puts non-null publishedAt first)
      const queryParams: {
        where: Record<string, unknown>;
        populate: unknown;
        orderBy?: Record<string, string>;
      } = {
        where: { documentId, locale: sourceLocale },
        populate,
      };
      if (contentTypes.hasDraftAndPublish(modelDef)) {
        queryParams.orderBy = { publishedAt: 'desc' };
      }

      const document = await strapi.db.query(model).findOne(queryParams);

      if (!document) {
        return null;
      }

      const schema = strapi.getModel(model) as Schema.ContentType;
      const getComponentSchema = (uid: string) =>
        (strapi.getModel(uid as UID.Schema) ?? { attributes: {} }) as Schema.Component;
      const components = new Proxy({} as Record<string, Schema.Component>, {
        get(_, uid: string) {
          return getComponentSchema(uid);
        },
      });

      return processDocumentData(
        document as unknown as Record<string, unknown>,
        schema,
        components,
        targetLocale
      );
    },
  };
};

export type FillFromLocaleService = ReturnType<typeof fillFromLocale>;
export default fillFromLocale;
