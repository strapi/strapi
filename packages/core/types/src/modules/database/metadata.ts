import type { Action, SubscriberFn } from './lifecycles';
import type { Model } from './model';
import type { ForeignKey, Index } from './schema';

/** @internal Public through `@strapi/database` only. */
export interface Meta extends Model {
  columnToAttribute: Record<string, string>;
  indexes: Index[];
  foreignKeys: ForeignKey[];
  lifecycles: Partial<Record<Action, SubscriberFn>>;
}

/** @internal Public through `@strapi/database` only. */
export interface Metadata extends Map<string, Meta> {
  readonly identifiers: Identifiers;
  readonly naming: AttributeNaming;
  get(key: string): Meta;
  add(meta: Meta): this;
  validate(): void;
  loadModels(models: Model[]): void;
}

/**
 * The rules that turn an attribute's logical name into the physical database
 * identifiers it maps to.
 *
 * @internal Public through `@strapi/database` only.
 */
export interface AttributeNaming {
  /**
   * Column on the model's own table for a scalar attribute.
   */
  columnName(attributeName: string): string;
  /**
   * Column on the model's own table for a relation stored as a join column
   * (`<attribute>_id`, i.e. `useJoinTable: false` or an owning x-to-one).
   */
  joinColumnName(attributeName: string): string;
  /**
   * Join/link table for a relation owned by `attributeName` on the model whose
   * table is `tableName`.
   */
  joinTableName(tableName: string, attributeName: string): string;
}

/** @internal Public through `@strapi/database` only. */
export type NameInput = string | string[];

/** @internal Public through `@strapi/database` only. */
export type CompressibleNameToken = {
  compressible: true;
  name: string;
  allocatedLength?: number;
};

/** @internal Public through `@strapi/database` only. */
export type IncompressibleNameToken = {
  compressible: false;
  name: string;
  allocatedLength?: number;
  shortName?: string;
};

/** @internal Public through `@strapi/database` only. */
export type NameToken = CompressibleNameToken | IncompressibleNameToken;

/** @internal Public through `@strapi/database` only. */
export type IdentifiersOptions = {
  maxLength: number;
};

/** @internal Public through `@strapi/database` only. */
export type NameOptions = {
  suffix?: string;
  prefix?: string;
};

/**
 * Builds the physical database identifiers (tables, columns, indexes), shortened to the
 * dialect's maximum length.
 *
 * @internal Public through `@strapi/database` only.
 */
export interface Identifiers {
  ID_COLUMN: 'id';
  ORDER_COLUMN: 'order';
  FIELD_COLUMN: 'field';
  HASH_LENGTH: 5;
  HASH_SEPARATOR: '';
  IDENTIFIER_SEPARATOR: '_';
  MIN_TOKEN_LENGTH: 3;
  readonly replacementMap: {
    links: string;
    order_inv_fk: string;
    order: string;
    morphs: string;
    index: string;
    inv_fk: string;
    order_fk: string;
    id_column_index: string;
    order_index: string;
    unique: string;
    primary: string;
  };
  readonly options: IdentifiersOptions;
  mapshortNames: (name: string) => string | undefined;
  getName: (names: NameInput, options?: NameOptions) => string;
  getTableName: (name: string, options?: NameOptions) => string;
  getJoinTableName: (
    collectionName: string,
    attributeName: string,
    options?: NameOptions
  ) => string;
  getMorphTableName: (
    collectionName: string,
    attributeName: string,
    options?: NameOptions
  ) => string;
  getColumnName: (attributeName: string, options?: NameOptions) => string;
  getJoinColumnAttributeIdName: (attributeName: string, options?: NameOptions) => string;
  getInverseJoinColumnAttributeIdName: (attributeName: string, options?: NameOptions) => string;
  getOrderColumnName: (singularName: string, options?: NameOptions) => string;
  getInverseOrderColumnName: (singularName: string, options?: NameOptions) => string;
  getMorphColumnJoinTableIdName: (singularName: string, options?: NameOptions) => string;
  getMorphColumnAttributeIdName: (attributeName: string, options?: NameOptions) => string;
  getMorphColumnTypeName: (attributeName: string, options?: NameOptions) => string;
  getIndexName: (names: NameInput, options?: NameOptions) => string;
  getFkIndexName: (names: NameInput, options?: NameOptions) => string;
  getUniqueIndexName: (names: NameInput, options?: NameOptions) => string;
  getPrimaryIndexName: (names: NameInput, options?: NameOptions) => string;
  getInverseFkIndexName: (names: NameInput, options?: NameOptions) => string;
  getOrderFkIndexName: (names: NameInput, options?: NameOptions) => string;
  getOrderInverseFkIndexName: (names: NameInput, options?: NameOptions) => string;
  getIdColumnIndexName: (names: NameInput, options?: NameOptions) => string;
  getOrderIndexName: (names: NameInput, options?: NameOptions) => string;
  getShortenedName: (name: string, len: number) => string;
  getNameFromTokens: (nameTokens: NameToken[]) => string;
  nameMap: Map<string, string>;
  getUnshortenedName: (shortName: string) => string;
  setUnshortenedName: (shortName: string, fullName: string) => void;
  serializeKey: (shortName: string) => string;
}
