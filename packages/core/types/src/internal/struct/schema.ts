import type { Attribute } from '../../schema';
import type { UID } from '../../public';

export type ContentTypeKind = 'collectionType' | 'singleType';

export type ModelType = 'contentType' | 'component';

/**
 * Represents a Strapi Schema once loaded by the server
 */
export interface Schema {
  /**
   * The unique identifier of the Schema
   */
  uid: UID.Schema;

  /**
   * The type of the model. Useful to discriminate content-types from component
   */
  modelType: ModelType;

  /**
   * Unique identifier of the schema
   */
  modelName: string;

  /**
   * Unique identifier of the schema
   */
  globalId: string;

  /**
   * Options declared and read by the plugins
   */
  pluginOptions?: SchemaPluginOptions;

  /**
   * Options object dedicated to Strapi core features
   */
  options?: SchemaOptions;

  /**
   * Custom table name for the schema
   */
  collectionName?: string;

  /**
   * Information about schema naming and display
   */
  info: SchemaInfo;

  /**
   * A collection of attributes for a given Schema.
   *
   * It is stored as a record, where each attribute is associated with a unique string key.
   *
   * The values should be instances of {@link Attribute.AnyAttribute}.
   */
  attributes: SchemaAttributes;
}

/**
 * Data structure containing naming and display information for a Schema
 */
export interface SchemaInfo {
  /**
   * Default name to use in the admin panel
   */
  displayName: string;

  /**
   * Description of the model
   */
  description?: string;

  /**
   * @strapi/icon name to use for the component's icon in the admin panel
   */
  icon?: string;
}

export type SchemaAttributes = Record<string, Attribute.AnyAttribute>;

/**
 * Structure containing every core schema options and their associated value
 */
export interface SchemaOptions {
  /**
   * EE only.
   */
  reviewWorkflows?: boolean;
  populateCreatorFields?: boolean;
  comment?: string;
  version?: string;
}

/**
 * Plugins' options for a Schema
 */
export interface SchemaPluginOptions {
  [key: string]: unknown;
}

/**
 * Schema for a content type
 */
export interface ContentTypeSchema extends Schema {
  modelType: 'contentType';

  /**
   * Unique identifier of the schema
   */
  uid: UID.ContentType;

  /**
   * Determine the type of the content type (single-type or collection-type)
   */
  kind: ContentTypeKind;

  /**
   * Information about schema naming and display
   */
  info: ContentTypeSchemaInfo;
}

/**
 * Represents information about a content type schema.
 * @extends SchemaInfo
 */
export interface ContentTypeSchemaInfo extends SchemaInfo {
  /**
   * Singular form of the content type name
   */
  singularName: string;

  /**
   * Plural form of the collection type name
   */
  pluralName: string;
}

/**
 * Schema for a collection type
 */
export interface CollectionTypeSchema extends ContentTypeSchema {
  kind: 'collectionType';
}

/**
 * Schema for a single type
 */
export interface SingleTypeSchema extends ContentTypeSchema {
  kind: 'singleType';
}

/**
 * Schema for a component
 */
export interface ComponentSchema extends Schema {
  modelType: 'component';

  uid: UID.Component;

  category: string;
}
