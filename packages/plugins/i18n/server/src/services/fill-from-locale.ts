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
  mainField: string,
  labelByKey: Map<string, unknown>
): string => {
  const key = relation.locale ? `${relation.documentId}:${relation.locale}` : relation.documentId;
  const value = labelByKey.get(key);
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
 * Add correct status to a relation using content-manager's document-metadata.
 */
const addStatusToRelation = async (
  targetUid: UID.Schema,
  relation: { documentId: string; id: number | string; locale?: string }
): Promise<{ documentId: string; id: number | string; locale?: string; status?: string }> => {
  const model = strapi.getModel(targetUid);
  if (!contentTypes.hasDraftAndPublish(model)) {
    return relation;
  }

  const documentMetadata = strapi.plugin('content-manager')?.service('document-metadata');
  if (!documentMetadata) {
    return relation;
  }

  const entries = await strapi.db.query(targetUid).findMany({
    where: {
      documentId: relation.documentId,
      ...(relation.locale ? { locale: relation.locale } : {}),
    },
    select: STATUS_FIELDS,
  });

  if (!entries.length) {
    return relation;
  }

  const version = entries.find((e) => e.publishedAt != null) ?? entries[0];
  const otherVersions = entries.filter((e) => e.id !== version.id);

  return {
    ...relation,
    status: documentMetadata.getStatus(version, otherVersions),
  };
};

/**
 * Resolve a relation for the target locale.
 * - Non-localized: keep same documentId and id
 * - Localized: find equivalent in target locale (same documentId, target locale)
 * - Localized without target translation: return null
 */
const resolveRelationForLocale = async (
  relation: { documentId: string; id?: number; locale?: string; [key: string]: unknown },
  targetUid: UID.Schema,
  targetLocale: string
): Promise<{
  documentId: string;
  id: number | string;
  locale?: string;
  status?: string;
} | null> => {
  if (!relation?.documentId) {
    return null;
  }

  const i18nContentTypesService = strapi.plugin('i18n')?.service('content-types');
  const isTargetLocalized = i18nContentTypesService?.isLocalizedContentType(
    strapi.getModel(targetUid)
  );

  if (!isTargetLocalized) {
    const resolved = {
      documentId: relation.documentId,
      id: relation.id ?? relation.documentId,
    };
    return addStatusToRelation(targetUid, resolved);
  }

  const targetEntry = await strapi.db.query(targetUid).findOne({
    where: {
      documentId: relation.documentId,
      locale: targetLocale,
    },
    select: STATUS_FIELDS,
  });

  if (!targetEntry) {
    return null;
  }

  const resolved = {
    documentId: targetEntry.documentId,
    id: targetEntry.id,
    locale: targetEntry.locale,
  };
  return addStatusToRelation(targetUid, resolved);
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
  const resolved = await Promise.all(
    relations
      .filter(
        (rel): rel is { documentId: string; id?: number; locale?: string } =>
          typeof rel === 'object' && rel !== null && 'documentId' in rel && !!rel.documentId
      )
      .map((rel) => resolveRelationForLocale(rel, targetUid, targetLocale))
  );
  const baseConnect = resolved
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .map((r, index) => ({
      ...r,
      __temp_key__: `a${index}`,
    }));

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

  const entries = await strapi.db.query(targetUid).findMany({
    where,
    select: selectFields,
  });

  const labelByKey = new Map<string, unknown>();
  for (const entry of entries) {
    const key = entry.locale ? `${entry.documentId}:${entry.locale}` : entry.documentId;
    labelByKey.set(key, entry[mainField]);
  }

  const connect = baseConnect.map((r) => ({
    ...r,
    [mainField]: labelByKey.get(r.locale ? `${r.documentId}:${r.locale}` : r.documentId),
    label: getRelationLabel(r, mainField, labelByKey),
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
      const documentManager = strapi.plugin('content-manager').service('document-manager');
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

      const document = await documentManager.findOne(documentId, model, {
        populate,
        locale: sourceLocale,
      });

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
