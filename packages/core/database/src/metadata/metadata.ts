import _ from 'lodash/fp';
import * as identifiers from '../utils/identifiers';
import * as types from '../utils/types';
import { createRelation } from './relations';
import type { Attribute, Model } from '../types';
import type { ForeignKey, Index } from '../schema/types';
import type { Action, SubscriberFn } from '../lifecycles';

export interface Meta extends Model {
  columnToAttribute: Record<string, string>;
  indexes: Index[];
  foreignKeys: ForeignKey[];
  lifecycles: Partial<Record<Action, SubscriberFn>>;
}

export class Metadata extends Map<string, Meta> {
  get(key: string): Meta {
    if (!super.has(key)) {
      throw new Error(`Metadata for "${key}" not found`);
    }

    return super.get(key) as Meta;
  }

  add(meta: Meta) {
    return this.set(meta.uid, meta);
  }

  /**
   * Validate the DB metadata, throwing an error if a duplicate DB table name is detected
   */
  validate() {
    const seenTables = new Map();
    for (const meta of this.values()) {
      if (seenTables.get(meta.tableName)) {
        throw new Error(
          `DB table "${meta.tableName}" already exists. Change the collectionName of the related content type.`
        );
      }
      seenTables.set(meta.tableName, true);
    }
  }

  loadModels(models: Model[] = []) {
    // init pass
    for (const model of _.cloneDeep(models)) {
      this.add({
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
    for (const meta of this.values()) {
      for (const [attributeName, attribute] of Object.entries(meta.attributes)) {
        try {
          if (types.isRelationalAttribute(attribute)) {
            createRelation(attributeName, attribute, meta, this);
            continue;
          }

          createAttribute(attributeName, attribute);
        } catch (error) {
          if (error instanceof Error) {
            throw new Error(
              `Error on attribute ${attributeName} in model ${meta.singularName}(${meta.uid}): ${error.message}`
            );
          }
        }
      }
    }

    for (const meta of this.values()) {
      const columnToAttribute = Object.keys(meta.attributes).reduce((acc, key) => {
        const attribute = meta.attributes[key];
        if ('columnName' in attribute) {
          return Object.assign(acc, { [attribute.columnName || key]: key });
        }

        return Object.assign(acc, { [key]: key });
      }, {});

      meta.columnToAttribute = columnToAttribute;
    }

    this.validate();
  }
}

const createAttribute = (attributeName: string, attribute: Attribute) => {
  const columnName = identifiers.getColumnName(attributeName);
  Object.assign(attribute, { columnName });
};
