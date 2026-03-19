import { isArray } from 'lodash/fp';
import { contentTypes } from '@strapi/utils';
import type { UID, Schema, Core } from '@strapi/types';

const READ_ACTION = 'plugin::content-manager.explorer.read';

/**
 * Returns the main display field for a model (e.g. title, name).
 * Uses content-manager configuration when available, falls back to first string attribute or 'id'.
 */
const getMainField = async (targetUid: UID.Schema): Promise<string> => {
  const contentManagerContentTypeService = strapi
    .plugin('content-manager')
    .service('content-types');
  const configuration = await contentManagerContentTypeService.findConfiguration({
    uid: targetUid,
  });
  return configuration.settings.mainField;
};

/**
 * Returns the display label for a relation.
 * Matches the logic of the getRelationLabel function in the content-manager plugin.
 */
const getRelationLabel = (relation: Record<string, unknown>, mainField: string): string => {
  const label = relation[mainField];
  if (typeof label === 'string') return label;
  return String(relation.documentId ?? '');
};

const FIELDS_TO_REMOVE = new Set([
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
]);

const STATUS_FIELDS = new Set(['id', 'documentId', 'locale', 'updatedAt', 'publishedAt']);

/**
 * Normalizes a value to an array: arrays pass through, single values become [value], null/undefined become [].
 */
const normalizeToArray = (value: unknown): unknown[] => {
  if (isArray(value)) return value;
  if (value) return [value];
  return [];
};

/**
 * Type guard: returns true if the value is a valid relation object with documentId.
 */
const isValidRelation = (
  rel: unknown
): rel is { documentId: string; id?: number; locale?: string } =>
  typeof rel === 'object' && rel !== null && 'documentId' in rel && !!(rel as any).documentId;

/**
 * Add status to relations (batched for better performance).
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
 * Maps relations from the source locale to target locale (batched for better performance).
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
    return relations.map((rel) => {
      if (rel.id === undefined) return null;
      return { documentId: rel.documentId, id: rel.id };
    });
  }

  const documentIds = [...new Set(relations.map((r) => r.documentId))];
  const targetEntriesQuery = {
    where: { documentId: { $in: documentIds }, locale: targetLocale },
    select: [...STATUS_FIELDS],
  };
  const targetEntries = await strapi.db.query(targetUid).findMany(targetEntriesQuery);
  const byDocumentId = new Map<string, (typeof targetEntries)[0]>();
  for (const e of targetEntries) {
    const existing = byDocumentId.get(e.documentId);
    if (!existing || (e.publishedAt === null && existing.publishedAt !== null)) {
      byDocumentId.set(e.documentId, e);
    }
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
 * Builds the where clause for relation queries: documentIds + locales (when target model is localized).
 */
const buildWhereForRelations = (
  relations: Array<{ documentId: string; locale?: string }>,
  documentIds: string[],
  targetUid: UID.Schema
): { documentId: { $in: string[] }; locale?: { $in: string[] } } => {
  const where: { documentId: { $in: string[] }; locale?: { $in: string[] } } = {
    documentId: { $in: documentIds },
  };
  const i18nContentTypesService = strapi.plugin('i18n')?.service('content-types');
  const isTargetLocalized = i18nContentTypesService?.isLocalizedContentType(
    strapi.getModel(targetUid)
  );
  if (isTargetLocalized) {
    const locales = [...new Set(relations.map((r) => r.locale).filter(Boolean))] as string[];
    if (locales.length > 0) {
      where.locale = { $in: locales };
    }
  }
  return where;
};

/**
 * Transform relation value to { connect: [...], disconnect: [] } with relations resolved for target locale.
 */
const transformRelationsForLocale = async (
  value: unknown,
  attribute: Schema.Attribute.Relation,
  targetLocale: string,
  userAbility: any
): Promise<{ connect: unknown[]; disconnect: unknown[] }> => {
  const attr = attribute as Schema.Attribute.Relation & { relation?: string; target?: string };
  if (attr.relation?.toLowerCase().includes('morph')) {
    return { connect: [], disconnect: [] };
  }

  const targetUid = attr.target as UID.Schema;
  if (!targetUid) {
    return { connect: [], disconnect: [] };
  }

  // Guard: skip relations to content types the user cannot read
  if (!userAbility.can(READ_ACTION, targetUid)) {
    return { connect: [], disconnect: [] };
  }

  const relations = normalizeToArray(value);
  const validRels = relations.filter(isValidRelation);
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

  const mainField = await getMainField(targetUid);
  const documentIds = [...new Set(baseConnect.map((r) => r.documentId))];
  const where = buildWhereForRelations(baseConnect, documentIds, targetUid);

  const fetchStatusEntries = () =>
    contentTypes.hasDraftAndPublish(strapi.getModel(targetUid))
      ? strapi.db.query(targetUid).findMany({ where, select: [...STATUS_FIELDS] })
      : Promise.resolve([]);

  const fetchLabelEntries = () =>
    strapi.db.query(targetUid).findMany({
      where,
      select: ['documentId', 'id', 'locale', mainField],
    });

  const [allStatusEntries, labelEntries] = await Promise.all([
    fetchStatusEntries(),
    fetchLabelEntries(),
  ]);

  const withStatus = addStatusToRelationsBatch(targetUid, baseConnect, allStatusEntries);

  const labelById = new Map<number | string, unknown>();
  for (const entry of labelEntries) {
    labelById.set(entry.id, entry[mainField]);
  }

  const connect = withStatus.map((r) => {
    const mainFieldValue = labelById.get(r.id);
    const relationWithMainField = { ...r, [mainField]: mainFieldValue };
    return {
      ...relationWithMainField,
      label: getRelationLabel(relationWithMainField, mainField),
    };
  });

  return { connect, disconnect: [] };
};

/**
 * Recursively process document data: remove fields and resolve relations.
 */
const processDocumentData = async (
  data: Record<string, unknown>,
  schema: Schema.ContentType | Schema.Component,
  components: Record<string, Schema.Component>,
  targetLocale: string,
  userAbility: any
): Promise<Record<string, unknown>> => {
  if (!data) {
    return {};
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (FIELDS_TO_REMOVE.has(key)) {
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
        targetLocale,
        userAbility
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
            const processed = await processDocumentData(
              item,
              compSchema,
              components,
              targetLocale,
              userAbility
            );
            return { ...processed, __temp_key__: index + 1 };
          })
        );
      } else if (value) {
        const processed = await processDocumentData(
          value as Record<string, unknown>,
          compSchema,
          components,
          targetLocale,
          userAbility
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
          const processed = await processDocumentData(
            item,
            compSchema,
            components,
            targetLocale,
            userAbility
          );
          return { ...processed, __temp_key__: index + 1 };
        })
      );
      continue;
    }

    result[key] = value;
  }

  return result;
};

export const createFillFromLocaleService = ({ strapi }: { strapi: Core.Strapi }) => {
  return {
    /**
     * Fetch the raw populated document for the given locale without any transformation.
     * The caller is responsible for sanitizing the output before passing it to transformDocument.
     */
    async fetchRawDocument(model: UID.ContentType, sourceLocale: string, documentId?: string) {
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

      const docs = strapi.documents(model);
      const baseParams = {
        locale: sourceLocale,
        populate: populate as never,
      };

      return documentId
        ? docs.findOne({ ...baseParams, documentId })
        : docs.findFirst({ ...baseParams });
    },

    /**
     * Transform a (sanitized) document: strip internal fields, resolve relations to the target
     * locale, and skip relations to content types the user cannot read.
     */
    async transformDocument(
      document: Record<string, unknown>,
      model: UID.ContentType,
      targetLocale: string,
      userAbility: any
    ) {
      const schema = strapi.getModel(model) as Schema.ContentType;
      const getComponentSchema = (uid: string) =>
        (strapi.getModel(uid as UID.Schema) ?? { attributes: {} }) as Schema.Component;
      const components = new Proxy({} as Record<string, Schema.Component>, {
        get(_, uid: string) {
          return getComponentSchema(uid);
        },
      });

      return processDocumentData(document, schema, components, targetLocale, userAbility);
    },
  };
};
