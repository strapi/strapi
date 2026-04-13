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

const FIELDS_TO_IGNORE = new Set([
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
  'localizations',
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

// ---------------------------------------------------------------------------
// Batch pre-resolution
// ---------------------------------------------------------------------------

type ValidRelation = { documentId: string; id?: number; locale?: string };
type ResolvedRelation = { documentId: string; id: number | string; locale?: string };
type RelationsByUid = Map<string, ValidRelation[]>;

interface UidResolutionData {
  blocked: boolean;
  mainField: string;
  /** sourceDocumentId → resolved entry in targetLocale (null if not found) */
  bySourceDocumentId: Map<string, ResolvedRelation | null>;
  /** resolvedEntry.id → status string */
  statusById: Map<number | string, string | undefined>;
  /** resolvedEntry.id → mainField value */
  labelById: Map<number | string, unknown>;
}

/**
 * Walk the full document tree and collect all valid relation objects grouped by targetUid.
 */
const collectRelationsByUid = (
  data: Record<string, unknown>,
  schema: Schema.ContentType | Schema.Component,
  components: Record<string, Schema.Component>
): RelationsByUid => {
  const result: RelationsByUid = new Map();

  const addRels = (uid: string, rels: ValidRelation[]) => {
    const existing = result.get(uid) ?? [];
    result.set(uid, existing.concat(rels));
  };

  const collect = (d: Record<string, unknown>, s: Schema.ContentType | Schema.Component) => {
    if (!d || typeof d !== 'object') return;
    for (const [key, value] of Object.entries(d)) {
      const attribute = s?.attributes?.[key];
      if (!attribute) continue;

      if (attribute.type === 'relation') {
        const attr = attribute as Schema.Attribute.Relation & {
          relation?: string;
          target?: string;
        };
        if (attr.relation?.toLowerCase().includes('morph') || !attr.target) continue;
        const validRels = normalizeToArray(value).filter(isValidRelation);
        if (validRels.length > 0) addRels(attr.target, validRels);
      } else if (attribute.type === 'component') {
        const compSchema = (components[attribute.component] ?? {
          attributes: {},
        }) as Schema.Component;
        if (attribute.repeatable && isArray(value)) {
          for (const item of value as Record<string, unknown>[]) {
            collect(item, compSchema);
          }
        } else if (value) {
          collect(value as Record<string, unknown>, compSchema);
        }
      } else if (attribute.type === 'dynamiczone' && isArray(value)) {
        for (const item of value as Record<string, unknown>[]) {
          const compUid = (item as any)?.__component as string;
          const compSchema = (components[compUid] ?? { attributes: {} }) as Schema.Component;
          collect(item as Record<string, unknown>, compSchema);
        }
      }
    }
  };

  collect(data, schema);
  return result;
};

/**
 * Resolves all relation targets for the requested locale in batches (per related content-type UID):
 * locale mapping, permissions, status, and labels.
 */
const resolveAllRelationsBatched = async (
  relationsByUid: RelationsByUid,
  targetLocale: string,
  userAbility: any
): Promise<Map<string, UidResolutionData>> => {
  const result = new Map<string, UidResolutionData>();
  await Promise.all(
    [...relationsByUid.entries()].map(async ([targetUid, allRels]) => {
      const empty: UidResolutionData = {
        blocked: !userAbility.can(READ_ACTION, targetUid),
        mainField: '',
        bySourceDocumentId: new Map(),
        statusById: new Map(),
        labelById: new Map(),
      };

      if (empty.blocked) {
        result.set(targetUid, empty);
        return;
      }

      const mainField = await getMainField(targetUid as UID.Schema);
      const validRels = allRels.filter(isValidRelation);

      if (validRels.length === 0) {
        result.set(targetUid, { ...empty, mainField });
        return;
      }

      // Deduplicate by documentId before querying
      const uniqueRels = [...new Map(validRels.map((r) => [r.documentId, r])).values()];
      const resolvedList = await resolveRelationsForLocaleBatch(
        uniqueRels,
        targetUid as UID.Schema,
        targetLocale
      );

      const bySourceDocumentId = new Map<string, ResolvedRelation | null>();
      for (let i = 0; i < uniqueRels.length; i += 1) {
        bySourceDocumentId.set(uniqueRels[i].documentId, resolvedList[i]);
      }

      const resolvedEntries = resolvedList.filter((r): r is ResolvedRelation => r !== null);

      if (resolvedEntries.length === 0) {
        result.set(targetUid, {
          blocked: false,
          mainField,
          bySourceDocumentId,
          statusById: new Map(),
          labelById: new Map(),
        });
        return;
      }

      const documentIds = [...new Set(resolvedEntries.map((r) => r.documentId))];
      const where = buildWhereForRelations(resolvedEntries, documentIds, targetUid as UID.Schema);

      const [allStatusEntries, labelEntries] = await Promise.all([
        contentTypes.hasDraftAndPublish(strapi.getModel(targetUid as UID.Schema))
          ? strapi.db.query(targetUid).findMany({ where, select: [...STATUS_FIELDS] })
          : Promise.resolve([]),
        strapi.db.query(targetUid).findMany({
          where,
          select: ['documentId', 'id', 'locale', mainField],
        }),
      ]);

      // Build status map
      const statusById = new Map<number | string, string | undefined>();
      if (allStatusEntries.length > 0) {
        const documentMetadata = strapi.plugin('content-manager')?.service('document-metadata');
        if (documentMetadata) {
          const model = strapi.getModel(targetUid as UID.Schema);
          const isLocalized = strapi
            .plugin('i18n')
            ?.service('content-types')
            ?.isLocalizedContentType(model);
          const groupKey = (e: { documentId: string; locale?: string }) =>
            isLocalized && e.locale ? `${e.documentId}:${e.locale}` : e.documentId;

          const byGroup = new Map<string, typeof allStatusEntries>();
          for (const e of allStatusEntries) {
            const key = groupKey(e);
            const list = byGroup.get(key) ?? [];
            list.push(e);
            byGroup.set(key, list);
          }

          for (const entry of resolvedEntries) {
            const key = groupKey(entry);
            const entries = byGroup.get(key) ?? [];
            if (!entries.length) continue;
            const version = entries.find((e) => e.id === entry.id) ?? entries[0];
            const otherVersions = entries.filter((e) => e.id !== version.id);
            statusById.set(entry.id, documentMetadata.getStatus(version, otherVersions));
          }
        }
      }

      // Build label map
      const labelById = new Map<number | string, unknown>();
      for (const entry of labelEntries) {
        labelById.set(entry.id, entry[mainField]);
      }

      result.set(targetUid, {
        blocked: false,
        mainField,
        bySourceDocumentId,
        statusById,
        labelById,
      });
    })
  );

  return result;
};

/**
 * Build the { connect, disconnect } for a single relation attribute using pre-fetched data.
 */
const buildConnectFromPreResolved = (
  value: unknown,
  attribute: Schema.Attribute.Relation,
  preResolved: Map<string, UidResolutionData>
): { connect: unknown[]; disconnect: unknown[] } => {
  const attr = attribute as Schema.Attribute.Relation & { relation?: string; target?: string };
  if (attr.relation?.toLowerCase().includes('morph') || !attr.target) {
    return { connect: [], disconnect: [] };
  }

  const uidData = preResolved.get(attr.target);
  if (!uidData || uidData.blocked) {
    return { connect: [], disconnect: [] };
  }

  const validRels = normalizeToArray(value).filter(isValidRelation);
  if (validRels.length === 0) {
    return { connect: [], disconnect: [] };
  }

  const connect = validRels
    .map((rel, index) => {
      const resolved = uidData.bySourceDocumentId.get(rel.documentId);
      if (!resolved) return null;

      const status = uidData.statusById.get(resolved.id);
      const mainFieldValue = uidData.labelById.get(resolved.id);
      const relationWithMainField: Record<string, unknown> = {
        ...resolved,
        [uidData.mainField]: mainFieldValue,
      };
      if (status !== undefined) {
        relationWithMainField.status = status;
      }

      return {
        ...relationWithMainField,
        __temp_key__: `a${index}`,
        label: getRelationLabel(relationWithMainField, uidData.mainField),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  return { connect, disconnect: [] };
};

/**
 * Recursively process document data: remove internal fields and resolve relations using
 * pre-fetched resolution data (no additional DB calls).
 */
const processDocumentData = async (
  data: Record<string, unknown>,
  schema: Schema.ContentType | Schema.Component,
  components: Record<string, Schema.Component>,
  preResolved: Map<string, UidResolutionData>
): Promise<Record<string, unknown>> => {
  if (!data) {
    return {};
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (FIELDS_TO_IGNORE.has(key)) {
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
      result[key] = buildConnectFromPreResolved(
        value,
        attribute as Schema.Attribute.Relation,
        preResolved
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
            const processed = await processDocumentData(item, compSchema, components, preResolved);
            return { ...processed, __temp_key__: index + 1 };
          })
        );
      } else if (value) {
        const processed = await processDocumentData(
          value as Record<string, unknown>,
          compSchema,
          components,
          preResolved
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
          const processed = await processDocumentData(item, compSchema, components, preResolved);
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

      const relsByUid = collectRelationsByUid(document, schema, components);
      const preResolved = await resolveAllRelationsBatched(relsByUid, targetLocale, userAbility);
      return processDocumentData(document, schema, components, preResolved);
    },
  };
};
