import { get, has, merge, set, unset } from 'lodash/fp';

import type { Core, Schema, UID } from '@strapi/types';
import type { traverseEntity } from '@strapi/utils';
import { transactionCtx } from '@strapi/database';
import { traverseEntityRelations } from '../transform/relations/utils/map-relation';

const RELATION_OPERATIONS = ['connect', 'disconnect', 'set'] as const;
type TraversableData = Parameters<typeof traverseEntity>[2];

type CloneRelationAttribute = Schema.Attribute.Relation & {
  targetAttribute?: string;
};

export type DeferredRelationCopy = {
  schemaUid: UID.Schema;
  attributeName: string;
  kind: 'joinTable' | 'fkColumn' | 'morphToOne';
  /** Lodash path to the owning entity in entry data (e.g. `details`). `null` = root entry. */
  ownerPath: string | null;
};

export type PostCloneRelationUpdate = {
  dataPath: string;
  value: Record<string, unknown>;
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
  const deferredCopies: DeferredRelationCopy[] = [];
  const postCloneUpdates: PostCloneRelationUpdate[] = [];

  await traverseEntityRelations(
    ({ attribute, key, path, schema, value }) => {
      if (!attribute || !isRelationAttribute(attribute)) {
        return;
      }

      const relationPath = path.rawWithIndices!;
      const ownerPath = path.raw === key ? null : (path.raw ?? null);

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
        unset(relationPath, data);
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
        unset(relationPath, data);
        deferredCopies.push({
          schemaUid: schema.uid as UID.Schema,
          attributeName: key,
          kind: 'fkColumn',
          ownerPath,
        });
        return;
      }

      if (relationIsUnchanged && isMorphToOneAttribute(attribute) && hasPopulatedRelation(value)) {
        unset(relationPath, data);
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
        unset(relationPath, data);
        return;
      }

      if (
        !relationIsUnchanged &&
        isRelationOperationPayload(submittedValue) &&
        hasMeaningfulRelationOperations(submittedValue) &&
        (!usesJoinTable(attribute) || isMorphToOneAttribute(attribute))
      ) {
        unset(relationPath, data);
        postCloneUpdates.push({
          dataPath: relationPath,
          value: submittedValue,
        });
      }
    },
    { schema: contentType, getModel },
    originalData as TraversableData
  );

  return { deferredCopies, postCloneUpdates };
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

    if (
      relationIsUnchanged &&
      isMorphToOneAttribute(attribute) &&
      hasPopulatedRelation(originalData[attributeName])
    ) {
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
  const attribute = strapi.db.metadata.get(uid).attributes[attributeName];

  if (attribute?.type !== 'relation' || !('joinColumn' in attribute) || !attribute.joinColumn) {
    return;
  }

  const joinColumnName = attribute.joinColumn.name;
  const sourceRow = await strapi.db
    .query(uid)
    .findOne({ where: { id: sourceEntryId }, select: [joinColumnName] });

  if (!sourceRow) {
    return;
  }

  await strapi.db.query(uid).update({
    where: { id: targetEntryId },
    data: { [joinColumnName]: sourceRow[joinColumnName] },
  });
};

const copyMorphToOneRelation = async (
  strapi: Core.Strapi,
  uid: UID.Schema,
  attributeName: string,
  sourceEntryId: number,
  targetEntryId: number
) => {
  const attribute = strapi.db.metadata.get(uid).attributes[attributeName];

  if (
    attribute?.type !== 'relation' ||
    attribute.relation !== 'morphToOne' ||
    !attribute.morphColumn
  ) {
    return;
  }

  const { idColumn, typeColumn } = attribute.morphColumn;
  const sourceRow = await strapi.db.query(uid).findOne({
    where: { id: sourceEntryId },
    select: [idColumn.name, typeColumn.name],
  });

  if (!sourceRow) {
    return;
  }

  await strapi.db.query(uid).update({
    where: { id: targetEntryId },
    data: {
      [idColumn.name]: sourceRow[idColumn.name],
      [typeColumn.name]: sourceRow[typeColumn.name],
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
    const sourceEntryId =
      resolveOwnerEntryId(originalData, task.ownerPath, sourceRootId) ?? sourceRootId;
    const targetEntryId =
      resolveOwnerEntryId(clonedData, task.ownerPath, targetRootId) ?? targetRootId;

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

export const applyPostCloneRelationUpdates = async (
  strapi: Core.Strapi,
  rootUid: UID.ContentType,
  clonedEntryId: number,
  clonedData: Record<string, unknown>,
  postCloneUpdates: PostCloneRelationUpdate[]
) => {
  if (postCloneUpdates.length === 0) {
    return;
  }

  const documentId = clonedData.documentId as string | undefined;

  if (!documentId) {
    return;
  }

  for (const update of postCloneUpdates) {
    const attributeName = update.dataPath.split('.').pop()!;
    const rootAttribute = strapi.db.metadata.get(rootUid).attributes[attributeName];
    const isFkDisconnect =
      rootAttribute?.type === 'relation' &&
      'joinColumn' in rootAttribute &&
      rootAttribute.joinColumn &&
      !('joinTable' in rootAttribute && rootAttribute.joinTable) &&
      isRelationOperationPayload(update.value) &&
      Array.isArray(update.value.disconnect) &&
      update.value.disconnect.length > 0 &&
      (!Array.isArray(update.value.connect) || update.value.connect.length === 0) &&
      !Object.prototype.hasOwnProperty.call(update.value, 'set');

    if (
      isFkDisconnect &&
      'joinColumn' in rootAttribute &&
      rootAttribute.joinColumn &&
      !update.dataPath.includes('.')
    ) {
      await strapi.db.query(rootUid).update({
        where: { id: clonedEntryId },
        data: { [rootAttribute.joinColumn.name]: null },
      });
      continue;
    }

    const isMorphToOneDisconnect =
      rootAttribute?.type === 'relation' &&
      isMorphToOneAttribute(rootAttribute as CloneRelationAttribute) &&
      isRelationOperationPayload(update.value) &&
      Array.isArray(update.value.disconnect) &&
      update.value.disconnect.length > 0 &&
      (!Array.isArray(update.value.connect) || update.value.connect.length === 0) &&
      !Object.prototype.hasOwnProperty.call(update.value, 'set');

    if (
      isMorphToOneDisconnect &&
      'morphColumn' in rootAttribute &&
      rootAttribute.morphColumn &&
      !update.dataPath.includes('.')
    ) {
      const { idColumn, typeColumn } = rootAttribute.morphColumn;
      await strapi.db.query(rootUid).update({
        where: { id: clonedEntryId },
        data: {
          [idColumn.name]: null,
          [typeColumn.name]: null,
        },
      });
      continue;
    }

    await strapi.documents(rootUid).update({
      documentId,
      locale: clonedData.locale as string | undefined,
      data: set(update.dataPath, update.value, {}),
    });
  }
};
