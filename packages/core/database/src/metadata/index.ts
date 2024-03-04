import _ from 'lodash/fp';
import * as identifiers from '../utils/identifiers';
import * as types from '../utils/types';
import {
  createRelation,
  isPolymorphic,
  isBidirectional,
  isAnyToOne,
  isOneToAny,
  hasOrderColumn,
  hasInverseOrderColumn,
  isManyToAny,
} from './relations';
import { Metadata, Meta } from './metadata';
import type { Attribute, Model, MetadataOptions } from '../types';

export type { Metadata, Meta };
export {
  isPolymorphic,
  isBidirectional,
  isAnyToOne,
  isOneToAny,
  hasOrderColumn,
  hasInverseOrderColumn,
  isManyToAny,
};

// TODO: check if there isn't an attribute with an id already
/**
 * Create Metadata from models configurations
 */
export const createMetadata = (models: Model[], options: MetadataOptions): Metadata => {
  const metadata = new Metadata();
  const maxLength = options.maxLength;

  // init pass
  for (const model of _.cloneDeep(models ?? [])) {
    metadata.add({
      ...model,
      // To prevent a breaking change, we can't snake_case here because v4 wasn't using it
      // TODO: We could change this to an alwaysSnakeCase option so that v5 is always snake cased but we can still get the original for migration purposes
      tableName: identifiers.getTableName(model.tableName, { maxLength, snakeCase: false }),
      attributes: {
        ...model.attributes,
      },
      lifecycles: model.lifecycles ?? {},
      indexes: model.indexes ?? [],
      foreignKeys: model.foreignKeys ?? [],
      columnToAttribute: {},
    });
  }

  // build compos / relations
  for (const meta of metadata.values()) {
    for (const [attributeName, attribute] of Object.entries(meta.attributes)) {
      try {
        if (types.isRelationalAttribute(attribute)) {
          createRelation(attributeName, attribute, meta, metadata, options);
          continue;
        }

        createAttribute(attributeName, attribute, options);
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(
            `Error on attribute ${attributeName} in model ${meta.singularName}(${meta.uid}): ${error.message}`
          );
        }
      }
    }
  }

  for (const meta of metadata.values()) {
    const columnToAttribute = Object.keys(meta.attributes).reduce((acc, key) => {
      const attribute = meta.attributes[key];
      if ('columnName' in attribute) {
        return Object.assign(acc, { [attribute.columnName || key]: key });
      }

      return Object.assign(acc, { [key]: key });
    }, {});

    meta.columnToAttribute = columnToAttribute;
  }

  metadata.validate();
  return metadata;
};

const createAttribute = (attributeName: string, attribute: Attribute, options: MetadataOptions) => {
  const columnName = identifiers.getColumnName(attributeName, options);
  Object.assign(attribute, { columnName });
};
