import { merge } from 'lodash/fp';

import type { Core, Schema, UID } from '@strapi/types';

const RELATION_OPERATIONS = ['connect', 'disconnect', 'set'] as const;

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

export const prepareCloneData = (
  originalData: Record<string, unknown>,
  submittedData: Record<string, unknown> | undefined,
  contentType: Schema.ContentType
) => {
  const submitted = submittedData ?? {};
  const data = merge(originalData, submitted) as Record<string, unknown>;
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

    if (hasMeaningfulOperations) {
      data[attributeName] = submittedValue;
    }

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
          ...(('on' in joinTable && joinTable.on) || {}),
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
