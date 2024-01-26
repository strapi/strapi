import _ from 'lodash/fp';

import * as types from '../utils/types';
import {
  createRelation,
  getJoinTableName,
  isPolymorphic,
  isBidirectional,
  isAnyToOne,
  isOneToAny,
  hasOrderColumn,
  hasInverseOrderColumn,
  isManyToAny,
} from './relations';
import { Metadata, Meta } from './metadata';
import type { Attribute, Model } from '../types';

export type { Metadata, Meta };
export {
  getJoinTableName,
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
export const createMetadata = (models: Model[] = []): Metadata => {
  const metadata = new Metadata();

  // init pass
  for (const model of _.cloneDeep(models)) {
    metadata.add({
      ...model,
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
          createRelation(attributeName, attribute, meta, metadata);
          continue;
        }

        createAttribute(attributeName, attribute);
      } catch (error) {
        console.log(error);
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

const createAttribute = (attributeName: string, attribute: Attribute) => {
  const columnName = _.snakeCase(attributeName);
  Object.assign(attribute, { columnName });
};
