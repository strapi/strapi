import type { Model } from '@strapi/database';
import type { Schema } from '@strapi/types';

export const createCompoLinkModel = (contentType: Schema.ContentType): Model => {
  const name = `${contentType.collectionName}_components`;

  return {
    // TODO: make sure there can't be any conflicts with a prefix
    singularName: name,
    uid: name,
    tableName: name,
    attributes: {
      id: {
        type: 'increments',
      },
      entity_id: {
        type: 'integer',
        column: {
          unsigned: true,
        },
      },
      component_id: {
        type: 'integer',
        column: {
          unsigned: true,
        },
      },
      component_type: {
        type: 'string',
      },
      field: {
        type: 'string',
      },
      order: {
        type: 'float',
        column: {
          unsigned: true,
          defaultTo: null,
        },
      },
    },
    indexes: [
      {
        name: `${contentType.collectionName}_field_index`,
        columns: ['field'],
      },
      {
        name: `${contentType.collectionName}_component_type_index`,
        columns: ['component_type'],
      },
      {
        name: `${contentType.collectionName}_entity_fk`,
        columns: ['entity_id'],
      },
      {
        name: `${contentType.collectionName}_unique`,
        columns: ['entity_id', 'component_id', 'field', 'component_type'],
        type: 'unique',
      },
    ],
    foreignKeys: [
      {
        name: `${contentType.collectionName}_entity_fk`,
        columns: ['entity_id'],
        referencedColumns: ['id'],
        referencedTable: contentType.collectionName!,
        onDelete: 'CASCADE',
      },
    ],
  };
};
