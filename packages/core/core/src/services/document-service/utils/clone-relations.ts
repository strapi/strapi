import { get, has, merge, set, unset } from 'lodash/fp';

import type { Core, Schema, UID } from '@strapi/types';
import { contentTypes, traverseEntity } from '@strapi/utils';
import { transactionCtx } from '@strapi/database';
import { traverseEntityRelations } from '../transform/relations/utils/map-relation';
import { getRelationTargetLocale } from '../transform/relations/utils/i18n';
import { getRelationTargetStatus } from '../transform/relations/utils/dp';

const RELATION_OPERATIONS = ['connect', 'disconnect', 'set'] as const;
type TraversableData = Parameters<typeof traverseEntity>[2];
type TraverseVisitor = Parameters<typeof traverseEntity>[0];

type CloneRelationAttribute = Schema.Attribute.Relation & {
  targetAttribute?: string;
};

export type DeferredRelationCopy = {
  schemaUid: UID.Schema;
  attributeName: string;
  kind: 'joinTable' | 'fkColumn' | 'morphToOne';
  /** Lodash path to the owning entity in entry data (e.g. `details` or `items.0`). `null` = root entry. */
  ownerPath: string | null;
};

export type PostCloneRelationUpdate = {
  dataPath: string;
  value: Record<string, unknown>;
  schemaUid: UID.Schema;
  ownerPath: string | null;
};

export type PrepareCloneDataResult = {
  data: Record<string, unknown>;
  deferredCopies: DeferredRelationCopy[];
  postCloneUpdates: PostCloneRelationUpdate[];
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

const isRelationAttribute = (attribute: unknown): attribute is CloneRelationAttribute => {
  return (
    isRecord(attribute) && attribute.type === 'relation' && typeof attribute.relation === 'string'
  );
};

const isRelationOperationPayload = (value: unknown): value is Record<string, unknown> => {
  return (
    isRecord(value) &&
    RELATION_OPERATIONS.some((operation) => Object.prototype.hasOwnProperty.call(value, operation))
  );
};

const hasMeaningfulRelationOperations = (value: Record<string, unknown>) => {
  if (Object.prototype.hasOwnProperty.call(value, 'set')) {
    return true;
  }

  return ['connect', 'disconnect'].some((operation) => {
    const operationValue = value[operation];
    return Array.isArray(operationValue) ? operationValue.length > 0 : operationValue != null;
  });
};

const usesJoinTable = (attribute: Schema.Attribute.Relation) => {
  return attribute.useJoinTable !== false;
};

const isBidirectionalOneToOne = (attribute: CloneRelationAttribute) => {
  return (
    attribute.relation === 'oneToOne' &&
    [attribute.inversedBy, attribute.mappedBy, attribute.targetAttribute].some(
      (inverseAttribute) => inverseAttribute != null
    )
  );
};

const isMorphToOneAttribute = (attribute: CloneRelationAttribute) => {
  return (attribute as { relation?: string }).relation === 'morphToOne';
};

const isBidirectionalOneToManyMappedBy = (attribute: CloneRelationAttribute) => {
  return attribute.relation === 'oneToMany' && attribute.mappedBy != null;
};

const hasPopulatedRelation = (value: unknown) => {
  return isRecord(value) && ('id' in value || 'documentId' in value);
};

const hasPopulatedRelationList = (value: unknown) => {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => isRecord(item) && ('id' in item || 'documentId' in item))
  );
};

const getSubmittedValueAtPath = (submitted: Record<string, unknown>, path: string) => {
  return get(path, submitted);
};

const wasRelationSubmittedAtPath = (submitted: Record<string, unknown>, path: string) => {
  return has(path, submitted);
};

const isRelationUnchangedAtPath = (
  submitted: Record<string, unknown>,
  path: string,
  submittedValue: unknown
) => {
  if (!wasRelationSubmittedAtPath(submitted, path)) {
    return true;
  }

  const isOperationPayload = isRelationOperationPayload(submittedValue);
  const hasMeaningfulOperations =
    isOperationPayload && hasMeaningfulRelationOperations(submittedValue);

  return isOperationPayload && !hasMeaningfulOperations;
};

/**
 * Like `traverseEntityRelations`, but also visits inline storage (`useJoinTable: false`
 * and `morphToOne`). Clone follow-up must see those relations; the shared transform
 * helper intentionally skips them because they are handled in processData.
 */
const traverseAllEntityRelations = async (
  visitor: TraverseVisitor,
  options: Parameters<typeof traverseEntity>[1],
  data: TraversableData
) => {
  return traverseEntity(
    async (visitorOptions, utils) => {
      const { attribute } = visitorOptions;

      if (!attribute || attribute.type !== 'relation') {
        return;
      }

      return visitor(visitorOptions, utils);
    },
    options,
    data
  );
};

const collectRelationOperationOverrides = async (
  submittedData: Record<string, unknown>,
  contentType: Schema.ContentType,
  getModel: (uid: string) => Schema.Schema
) => {
  const overrides = new Map<string, Record<string, unknown>>();

  await traverseEntityRelations(
    ({ path, value }) => {
      if (isRelationOperationPayload(value) && hasMeaningfulRelationOperations(value)) {
        overrides.set(path.rawWithIndices!, value);
      }
    },
    { schema: contentType, getModel },
    submittedData as TraversableData
  );

  return [...overrides.entries()].sort(([leftPath], [rightPath]) =>
    leftPath.localeCompare(rightPath)
  );
};

const collectNestedCloneRelationAdjustments = async (
  originalData: Record<string, unknown>,
  submitted: Record<string, unknown>,
  contentType: Schema.ContentType,
  getModel: (uid: string) => Schema.Schema,
  data: Record<string, unknown>
) => {
  let adjustedData = data;
  const deferredCopies: DeferredRelationCopy[] = [];
  const postCloneUpdates: PostCloneRelationUpdate[] = [];

  await traverseAllEntityRelations(
    ({ attribute, key, path, schema, value }) => {
      if (!attribute || !isRelationAttribute(attribute)) {
        return;
      }

      const relationPath = path.rawWithIndices!;
      // Owner is the parent of the relation path (preserve indices for
      // repeatable components / DZs, e.g. `items.0.tag` → `items.0`).
      // Top-level relations have no parent segment → null (root entry).
      const lastDot = relationPath.lastIndexOf('.');
      const ownerPath = lastDot === -1 ? null : relationPath.slice(0, lastDot);

      if (ownerPath == null) {
        return;
      }

      const submittedValue = getSubmittedValueAtPath(submitted, relationPath);
      const relationIsUnchanged = isRelationUnchangedAtPath(
        submitted,
        relationPath,
        submittedValue
      );

      if (
        relationIsUnchanged &&
        isBidirectionalOneToOne(attribute) &&
        usesJoinTable(attribute) &&
        hasPopulatedRelation(value)
      ) {
        adjustedData = unset(relationPath, adjustedData) as Record<string, unknown>;
        deferredCopies.push({
          schemaUid: schema.uid as UID.Schema,
          attributeName: key,
          kind: 'joinTable',
          ownerPath,
        });
        return;
      }

      if (
        relationIsUnchanged &&
        isBidirectionalOneToOne(attribute) &&
        !usesJoinTable(attribute) &&
        hasPopulatedRelation(value)
      ) {
        adjustedData = unset(relationPath, adjustedData) as Record<string, unknown>;
        deferredCopies.push({
          schemaUid: schema.uid as UID.Schema,
          attributeName: key,
          kind: 'fkColumn',
          ownerPath,
        });
        return;
      }

      // Always defer morphToOne: populate can be null even when morph columns are set.
      if (relationIsUnchanged && isMorphToOneAttribute(attribute)) {
        adjustedData = unset(relationPath, adjustedData) as Record<string, unknown>;
        deferredCopies.push({
          schemaUid: schema.uid as UID.Schema,
          attributeName: key,
          kind: 'morphToOne',
          ownerPath,
        });
        return;
      }

      if (
        relationIsUnchanged &&
        isBidirectionalOneToManyMappedBy(attribute) &&
        hasPopulatedRelationList(value)
      ) {
        adjustedData = unset(relationPath, adjustedData) as Record<string, unknown>;
        return;
      }

      if (
        !relationIsUnchanged &&
        isRelationOperationPayload(submittedValue) &&
        hasMeaningfulRelationOperations(submittedValue) &&
        (!usesJoinTable(attribute) || isMorphToOneAttribute(attribute))
      ) {
        adjustedData = unset(relationPath, adjustedData) as Record<string, unknown>;
        postCloneUpdates.push({
          dataPath: relationPath,
          value: submittedValue,
          schemaUid: schema.uid as UID.Schema,
          ownerPath,
        });
      }
    },
    { schema: contentType, getModel },
    originalData as TraversableData
  );

  return { data: adjustedData, deferredCopies, postCloneUpdates };
};

export const prepareCloneData = async (
  originalData: Record<string, unknown>,
  submittedData: Record<string, unknown> | undefined,
  contentType: Schema.ContentType,
  getModel: (uid: string) => Schema.Schema
): Promise<PrepareCloneDataResult> => {
  const submitted = submittedData ?? {};
  const relationOperationOverrides = await collectRelationOperationOverrides(
    submitted,
    contentType,
    getModel
  );
  let data = merge(originalData, submitted) as Record<string, unknown>;
  const deferredCopies: DeferredRelationCopy[] = [];
  const postCloneUpdates: PostCloneRelationUpdate[] = [];

  for (const [attributeName, attribute] of Object.entries(contentType.attributes)) {
    if (!isRelationAttribute(attribute)) {
      continue;
    }

    const submittedValue = submitted[attributeName];
    const relationWasSubmitted = Object.prototype.hasOwnProperty.call(submitted, attributeName);
    const isOperationPayload = isRelationOperationPayload(submittedValue);
    const hasMeaningfulOperations =
      isOperationPayload && hasMeaningfulRelationOperations(submittedValue);
    const relationIsUnchanged =
      !relationWasSubmitted || (isOperationPayload && !hasMeaningfulOperations);

    if (
      relationIsUnchanged &&
      isBidirectionalOneToOne(attribute) &&
      usesJoinTable(attribute) &&
      hasPopulatedRelation(originalData[attributeName])
    ) {
      delete data[attributeName];
      deferredCopies.push({
        schemaUid: contentType.uid as UID.Schema,
        attributeName,
        kind: 'joinTable',
        ownerPath: null,
      });
      continue;
    }

    if (
      relationIsUnchanged &&
      isBidirectionalOneToOne(attribute) &&
      !usesJoinTable(attribute) &&
      hasPopulatedRelation(originalData[attributeName])
    ) {
      delete data[attributeName];
      deferredCopies.push({
        schemaUid: contentType.uid as UID.Schema,
        attributeName,
        kind: 'fkColumn',
        ownerPath: null,
      });
      continue;
    }

    // Always defer morphToOne: populate can be null even when morph columns are set.
    if (relationIsUnchanged && isMorphToOneAttribute(attribute)) {
      delete data[attributeName];
      deferredCopies.push({
        schemaUid: contentType.uid as UID.Schema,
        attributeName,
        kind: 'morphToOne',
        ownerPath: null,
      });
      continue;
    }

    if (
      relationIsUnchanged &&
      isBidirectionalOneToManyMappedBy(attribute) &&
      hasPopulatedRelationList(originalData[attributeName])
    ) {
      delete data[attributeName];
      continue;
    }

    if (
      !relationIsUnchanged &&
      isRelationOperationPayload(submittedValue) &&
      hasMeaningfulOperations &&
      (!usesJoinTable(attribute) || isMorphToOneAttribute(attribute))
    ) {
      delete data[attributeName];
      postCloneUpdates.push({
        dataPath: attributeName,
        value: submittedValue,
        schemaUid: contentType.uid as UID.Schema,
        ownerPath: null,
      });
    }
  }

  const nested = await collectNestedCloneRelationAdjustments(
    originalData,
    submitted,
    contentType,
    getModel,
    data
  );
  data = nested.data;
  deferredCopies.push(...nested.deferredCopies);
  postCloneUpdates.push(...nested.postCloneUpdates);

  for (const [path, value] of relationOperationOverrides) {
    data = set(path, value, data) as Record<string, unknown>;
  }

  return { data, deferredCopies, postCloneUpdates };
};

const resolveOwnerEntryId = (
  entryData: Record<string, unknown>,
  ownerPath: string | null,
  fallbackId?: number
) => {
  if (ownerPath == null) {
    return fallbackId;
  }

  const owner = get(ownerPath, entryData) as Record<string, unknown> | undefined;
  const ownerId = owner?.id;

  return typeof ownerId === 'number' ? ownerId : undefined;
};

export const copyCloneRelationRows = async (
  strapi: Core.Strapi,
  uid: UID.Schema,
  attributeName: string,
  sourceEntryId: number,
  targetEntryId: number
) => {
  const { attributes } = strapi.db.metadata.get(uid);
  const attribute = attributes[attributeName];

  if (attribute?.type !== 'relation' || !('joinTable' in attribute) || !attribute.joinTable) {
    return;
  }

  const idColumn = strapi.db.metadata.identifiers.ID_COLUMN;
  const batchSize = strapi.db.dialect.getBatchInsertSize();
  const { joinTable } = attribute;
  const { joinColumn } = joinTable;

  const trx = transactionCtx.get();
  const rows = (await strapi.db
    .connection(joinTable.name)
    .where({
      [joinColumn.name]: sourceEntryId,
      ...(('on' in joinTable && joinTable.on) || {}),
    })
    .select('*')
    .modify((qb) => {
      if (trx) {
        qb.transacting(trx);
      }
    })) as Record<string, unknown>[];

  const rowsToCopy = rows.map((row) => {
    const copiedRow = { ...row, [joinColumn.name]: targetEntryId };
    delete copiedRow[idColumn];
    return copiedRow;
  });

  for (let index = 0; index < rowsToCopy.length; index += batchSize) {
    await strapi.db
      .connection(joinTable.name)
      .insert(rowsToCopy.slice(index, index + batchSize))
      .modify((qb) => {
        if (trx) {
          qb.transacting(trx);
        }
      });
  }
};

const copyFkColumnRelation = async (
  strapi: Core.Strapi,
  uid: UID.Schema,
  attributeName: string,
  sourceEntryId: number,
  targetEntryId: number
) => {
  const meta = strapi.db.metadata.get(uid);
  const attribute = meta.attributes[attributeName];

  if (attribute?.type !== 'relation' || !('joinColumn' in attribute) || !attribute.joinColumn) {
    return;
  }

  // Inverse/non-owning joinColumn.name is this table's `id`, not an FK. Copying it
  // attaches an unrelated row whose numeric id happens to match the source id.
  if (!('owner' in attribute) || attribute.owner !== true) {
    return;
  }

  const joinColumnName = attribute.joinColumn.name;
  const trx = transactionCtx.get();
  const sourceRow = await strapi.db
    .connection(meta.tableName)
    .where({ id: sourceEntryId })
    .select([joinColumnName])
    .modify((qb) => {
      if (trx) {
        qb.transacting(trx);
      }
    })
    .first();

  if (!sourceRow) {
    return;
  }

  // processData only accepts attribute names, not raw join-column names
  await strapi.db.query(uid).update({
    where: { id: targetEntryId },
    data: { [attributeName]: sourceRow[joinColumnName] ?? null },
  });
};

const copyMorphToOneRelation = async (
  strapi: Core.Strapi,
  uid: UID.Schema,
  attributeName: string,
  sourceEntryId: number,
  targetEntryId: number
) => {
  const meta = strapi.db.metadata.get(uid);
  const attribute = meta.attributes[attributeName];

  if (
    attribute?.type !== 'relation' ||
    attribute.relation !== 'morphToOne' ||
    !attribute.morphColumn
  ) {
    return;
  }

  const { idColumn, typeColumn, typeField = '__type' } = attribute.morphColumn;
  const trx = transactionCtx.get();
  const sourceRow = await strapi.db
    .connection(meta.tableName)
    .where({ id: sourceEntryId })
    .select([idColumn.name, typeColumn.name])
    .modify((qb) => {
      if (trx) {
        qb.transacting(trx);
      }
    })
    .first();

  if (!sourceRow) {
    return;
  }

  const morphId = sourceRow[idColumn.name];
  const morphType = sourceRow[typeColumn.name];

  // processData only accepts the morph attribute ({ id, __type }), not raw column names
  await strapi.db.query(uid).update({
    where: { id: targetEntryId },
    data: {
      [attributeName]:
        morphId != null && morphType != null ? { id: morphId, [typeField]: morphType } : null,
    },
  });
};

export const applyDeferredCloneRelationCopies = async (
  strapi: Core.Strapi,
  rootUid: UID.ContentType,
  sourceRootId: number,
  targetRootId: number,
  originalData: Record<string, unknown>,
  clonedData: Record<string, unknown>,
  deferredCopies: DeferredRelationCopy[]
) => {
  if (deferredCopies.length === 0) {
    return;
  }

  for (const task of deferredCopies) {
    // Root owners (ownerPath === null) resolve via the fallback root IDs.
    // Nested owners must resolve explicitly — falling back to the root ID would
    // copy component-schema relation rows using an unrelated document ID.
    const sourceEntryId = resolveOwnerEntryId(originalData, task.ownerPath, sourceRootId);
    const targetEntryId = resolveOwnerEntryId(clonedData, task.ownerPath, targetRootId);

    if (sourceEntryId == null || targetEntryId == null) {
      throw new Error(
        `Unable to resolve clone relation owner for "${task.attributeName}" at path "${task.ownerPath ?? '<root>'}"`
      );
    }

    if (sourceEntryId === targetEntryId) {
      continue;
    }

    if (task.kind === 'joinTable') {
      await copyCloneRelationRows(
        strapi,
        task.schemaUid,
        task.attributeName,
        sourceEntryId,
        targetEntryId
      );
    } else if (task.kind === 'fkColumn') {
      await copyFkColumnRelation(
        strapi,
        task.schemaUid,
        task.attributeName,
        sourceEntryId,
        targetEntryId
      );
    } else if (task.kind === 'morphToOne') {
      await copyMorphToOneRelation(
        strapi,
        task.schemaUid,
        task.attributeName,
        sourceEntryId,
        targetEntryId
      );
    }
  }
};

const pickInlineRelationTargetRef = (
  value: Record<string, unknown>
): Record<string, unknown> | null | undefined => {
  if (Object.prototype.hasOwnProperty.call(value, 'set')) {
    const setValue = value.set;
    if (!Array.isArray(setValue) || setValue.length === 0) {
      return null;
    }

    const last = setValue[setValue.length - 1];
    if (isRecord(last)) {
      return last;
    }
    if (typeof last === 'number' || typeof last === 'string') {
      return { id: last };
    }

    return undefined;
  }

  const connect = value.connect;
  if (Array.isArray(connect) && connect.length > 0) {
    const last = connect[connect.length - 1];
    if (isRecord(last)) {
      return last;
    }
    if (typeof last === 'number' || typeof last === 'string') {
      return { id: last };
    }

    return undefined;
  }

  return undefined;
};

const toRelationStatus = (value: unknown): 'draft' | 'published' | undefined => {
  return value === 'draft' || value === 'published' ? value : undefined;
};

const resolveEntryIdByRef = async (
  strapi: Core.Strapi,
  sourceUid: UID.Schema,
  targetUid: UID.Schema,
  ref: Record<string, unknown>,
  opts: { locale?: string }
): Promise<number | undefined> => {
  if (typeof ref.id === 'number') {
    return ref.id;
  }

  if (typeof ref.documentId !== 'string') {
    return undefined;
  }

  const relation = {
    documentId: ref.documentId,
    locale: typeof ref.locale === 'string' ? ref.locale : undefined,
    status: toRelationStatus(ref.status),
  };

  const targetLocale = getRelationTargetLocale(relation, {
    targetUid,
    sourceUid,
    sourceLocale: opts.locale,
  });

  const sourceHasDP = contentTypes.hasDraftAndPublish(strapi.getModel(sourceUid));
  const statuses = getRelationTargetStatus(relation, {
    targetUid,
    sourceUid,
    sourceStatus: sourceHasDP ? 'draft' : undefined,
  });

  const model = strapi.getModel(targetUid);
  const targetHasDP = contentTypes.hasDraftAndPublish(model);

  // Single-column FK/morph storage can keep only one id; match entity-manager and
  // keep the last resolved status when the standard resolver returns both.
  let resolvedId: number | undefined;

  for (const status of statuses) {
    const where: Record<string, unknown> = { documentId: ref.documentId };

    if (targetHasDP) {
      where.publishedAt = status === 'draft' ? null : { $ne: null };
    }

    if (targetLocale) {
      where.locale = targetLocale;
    }

    const row = await strapi.db.query(targetUid).findOne({
      where,
      select: ['id'],
    });

    if (typeof row?.id === 'number') {
      resolvedId = row.id;
    }
  }

  return resolvedId;
};

const getMorphTypeField = (attribute: CloneRelationAttribute) => {
  const morphColumn =
    'morphColumn' in attribute
      ? (attribute as { morphColumn?: { typeField?: string } }).morphColumn
      : undefined;

  return morphColumn?.typeField ?? '__type';
};

const hasRelationTarget = (
  attribute: CloneRelationAttribute
): attribute is CloneRelationAttribute & { target: string } => {
  return 'target' in attribute && typeof (attribute as { target?: unknown }).target === 'string';
};

const currentAssociationId = (current: unknown): number | undefined => {
  if (typeof current === 'number') {
    return current;
  }

  if (isRecord(current) && typeof current.id === 'number') {
    return current.id;
  }

  return undefined;
};

const disconnectMatchesCurrent = async (
  strapi: Core.Strapi,
  sourceUid: UID.Schema,
  attribute: CloneRelationAttribute,
  disconnect: unknown[],
  current: unknown,
  opts: { locale?: string }
): Promise<boolean> => {
  const currentId = currentAssociationId(current);

  if (currentId == null) {
    return false;
  }

  const typeField = getMorphTypeField(attribute);
  const currentType =
    isMorphToOneAttribute(attribute) && isRecord(current) && typeof current[typeField] === 'string'
      ? current[typeField]
      : undefined;

  for (const item of disconnect) {
    let ref: Record<string, unknown> | null = null;
    if (isRecord(item)) {
      ref = item;
    } else if (typeof item === 'number' || typeof item === 'string') {
      ref = { id: item };
    }

    if (!ref) {
      continue;
    }

    if (isMorphToOneAttribute(attribute)) {
      const targetUid = ref[typeField];
      if (typeof targetUid !== 'string') {
        continue;
      }

      if (currentType != null && currentType !== targetUid) {
        continue;
      }

      const id = await resolveEntryIdByRef(strapi, sourceUid, targetUid as UID.Schema, ref, opts);
      if (id === currentId) {
        return true;
      }

      continue;
    }

    if (!hasRelationTarget(attribute)) {
      continue;
    }

    const id = await resolveEntryIdByRef(
      strapi,
      sourceUid,
      attribute.target as UID.Schema,
      ref,
      opts
    );
    if (id === currentId) {
      return true;
    }
  }

  return false;
};

const resolveInlineRelationAssignment = async (
  strapi: Core.Strapi,
  attribute: CloneRelationAttribute,
  value: Record<string, unknown>,
  opts: {
    locale?: string;
    sourceUid: UID.Schema;
    originalValue?: unknown;
    sourceOwnerId?: number;
    targetOwnerId: number;
    attributeName: string;
  }
): Promise<unknown> => {
  const targetRef = pickInlineRelationTargetRef(value);

  if (targetRef === undefined) {
    const disconnect = value.disconnect;
    if (!Array.isArray(disconnect) || disconnect.length === 0) {
      return undefined;
    }

    const matches = await disconnectMatchesCurrent(
      strapi,
      opts.sourceUid,
      attribute,
      disconnect,
      opts.originalValue,
      { locale: opts.locale }
    );

    if (matches) {
      return null;
    }

    // Unmatched disconnect must keep the original association. The clone was
    // created without the relation (stripped from create data), so copy it now.
    if (opts.sourceOwnerId == null) {
      throw new Error(
        `Unable to restore clone relation "${opts.attributeName}" after unmatched disconnect`
      );
    }

    if (isMorphToOneAttribute(attribute)) {
      await copyMorphToOneRelation(
        strapi,
        opts.sourceUid,
        opts.attributeName,
        opts.sourceOwnerId,
        opts.targetOwnerId
      );
    } else {
      await copyFkColumnRelation(
        strapi,
        opts.sourceUid,
        opts.attributeName,
        opts.sourceOwnerId,
        opts.targetOwnerId
      );
    }

    return undefined;
  }

  if (targetRef === null) {
    return null;
  }

  if (isMorphToOneAttribute(attribute)) {
    const typeField = getMorphTypeField(attribute);
    const targetUid = targetRef[typeField];

    if (typeof targetUid !== 'string') {
      throw new Error(`Inline morphToOne clone update requires ${typeField}`);
    }

    const id = await resolveEntryIdByRef(
      strapi,
      opts.sourceUid,
      targetUid as UID.Schema,
      targetRef,
      opts
    );

    if (id == null) {
      throw new Error(`Unable to resolve morphToOne target for clone relation update`);
    }

    return { id, [typeField]: targetUid };
  }

  if (!hasRelationTarget(attribute)) {
    throw new Error('Inline FK clone update requires a relation target');
  }

  const id = await resolveEntryIdByRef(
    strapi,
    opts.sourceUid,
    attribute.target as UID.Schema,
    targetRef,
    opts
  );

  if (id == null) {
    throw new Error(`Unable to resolve relation target for clone relation update`);
  }

  return id;
};

export const applyPostCloneRelationUpdates = async (
  strapi: Core.Strapi,
  _rootUid: UID.ContentType,
  sourceRootId: number,
  clonedEntryId: number,
  clonedData: Record<string, unknown>,
  originalData: Record<string, unknown>,
  postCloneUpdates: PostCloneRelationUpdate[]
) => {
  if (postCloneUpdates.length === 0) {
    return;
  }

  const locale = clonedData.locale as string | undefined;

  for (const update of postCloneUpdates) {
    const attributeName = update.dataPath.split('.').pop()!;
    const ownerEntryId = resolveOwnerEntryId(clonedData, update.ownerPath, clonedEntryId);
    const sourceOwnerId = resolveOwnerEntryId(originalData, update.ownerPath, sourceRootId);

    if (ownerEntryId == null) {
      throw new Error(
        `Unable to resolve clone relation owner for "${attributeName}" at path "${update.ownerPath ?? '<root>'}"`
      );
    }

    const attribute = strapi.db.metadata.get(update.schemaUid).attributes[attributeName] as
      | CloneRelationAttribute
      | undefined;

    if (!attribute || attribute.type !== 'relation') {
      throw new Error(
        `Unable to resolve clone relation attribute "${attributeName}" on "${update.schemaUid}"`
      );
    }

    const assignment = await resolveInlineRelationAssignment(strapi, attribute, update.value, {
      locale,
      sourceUid: update.schemaUid,
      originalValue: get(update.dataPath, originalData),
      sourceOwnerId,
      targetOwnerId: ownerEntryId,
      attributeName,
    });

    if (assignment === undefined) {
      continue;
    }

    // processData accepts attribute names (FK id / morph { id, __type }), not operation payloads.
    await strapi.db.query(update.schemaUid).update({
      where: { id: ownerEntryId },
      data: { [attributeName]: assignment },
    });
  }
};
