import { merge, set } from 'lodash/fp';

import type { Core, Schema, UID } from '@strapi/types';
import type { traverseEntity } from '@strapi/utils';
import { traverseEntityRelations } from '../transform/relations/utils/map-relation';

const RELATION_OPERATIONS = ['connect', 'disconnect', 'set'] as const;
type TraversableData = Parameters<typeof traverseEntity>[2];

type CloneRelationAttribute = Schema.Attribute.Relation & {
  targetAttribute?: string;
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

const canTransformRelationOperationPayload = (attribute: Schema.Attribute.Relation) => {
  return attribute.useJoinTable !== false && attribute.relation !== 'morphToOne';
};

const isBidirectionalOneToOne = (attribute: CloneRelationAttribute) => {
  return (
    attribute.relation === 'oneToOne' &&
    [attribute.inversedBy, attribute.mappedBy, attribute.targetAttribute].some(
      (inverseAttribute) => inverseAttribute != null
    )
  );
};

const hasPopulatedRelation = (value: unknown) => {
  return isRecord(value) && ('id' in value || 'documentId' in value);
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

export const prepareCloneData = async (
  originalData: Record<string, unknown>,
  submittedData: Record<string, unknown> | undefined,
  contentType: Schema.ContentType,
  getModel: (uid: string) => Schema.Schema
) => {
  const submitted = submittedData ?? {};
  const relationOperationOverrides = await collectRelationOperationOverrides(
    submitted,
    contentType,
    getModel
  );
  let data = merge(originalData, submitted) as Record<string, unknown>;
  const relationsToCopy: string[] = [];

  for (const [attributeName, attribute] of Object.entries(contentType.attributes)) {
    if (!isRelationAttribute(attribute) || !canTransformRelationOperationPayload(attribute)) {
      continue;
    }

    const relationWasSubmitted = Object.prototype.hasOwnProperty.call(submitted, attributeName);
    const submittedValue = submitted[attributeName];
    const isOperationPayload = isRelationOperationPayload(submittedValue);
    const hasMeaningfulOperations =
      isOperationPayload && hasMeaningfulRelationOperations(submittedValue);

    const relationIsUnchanged =
      !relationWasSubmitted || (isOperationPayload && !hasMeaningfulOperations);

    if (
      relationIsUnchanged &&
      isBidirectionalOneToOne(attribute) &&
      hasPopulatedRelation(originalData[attributeName])
    ) {
      // Normal relation attachment enforces oneToOne ownership by removing the source link.
      // Leave unchanged relations out of create and copy their join row after the clone exists.
      delete data[attributeName];
      relationsToCopy.push(attributeName);
    }
  }

  for (const [path, value] of relationOperationOverrides) {
    data = set(path, value, data) as Record<string, unknown>;
  }

  return { data, relationsToCopy };
};

export const copyCloneRelationRows = async (
  strapi: Core.Strapi,
  uid: UID.ContentType,
  sourceEntryId: number,
  targetEntryId: number,
  attributeNames: string[]
) => {
  if (attributeNames.length === 0) {
    return;
  }

  const { attributes } = strapi.db.metadata.get(uid);
  const idColumn = strapi.db.metadata.identifiers.ID_COLUMN;
  const batchSize = strapi.db.dialect.getBatchInsertSize();

  await strapi.db.transaction(async ({ trx }) => {
    for (const attributeName of attributeNames) {
      const attribute = attributes[attributeName];

      if (attribute?.type !== 'relation' || !('joinTable' in attribute) || !attribute.joinTable) {
        continue;
      }

      const { joinTable } = attribute;
      const { joinColumn } = joinTable;
      const rows = (await strapi.db
        .connection(joinTable.name)
        .where({
          [joinColumn.name]: sourceEntryId,
          ...(('on' in joinTable && joinTable.on) || undefined),
        })
        .select('*')
        .transacting(trx)) as Record<string, unknown>[];

      const rowsToCopy = rows.map((row) => {
        const copiedRow = { ...row, [joinColumn.name]: targetEntryId };
        delete copiedRow[idColumn];
        return copiedRow;
      });

      for (let index = 0; index < rowsToCopy.length; index += batchSize) {
        await strapi.db
          .connection(joinTable.name)
          .insert(rowsToCopy.slice(index, index + batchSize))
          .transacting(trx);
      }
    }
  });
};
