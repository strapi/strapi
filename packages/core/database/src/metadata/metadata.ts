import type { Model } from '../types';
import type { ForeignKey, Index } from '../schema/types';
import type { Action, SubscriberFn } from '../lifecycles';

export interface ComponentLinkMeta extends Meta {
  componentLink: Meta;
}

export interface Meta extends Model {
  columnToAttribute: Record<string, string>;
  componentLink?: Meta;
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
}
