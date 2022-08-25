import { Attribute, ComponentAttribute } from '../attributes';
import { KeysBy, StringRecord } from '../../utils';

/**
 * Literal union type representing the possible natures of a content type
 */
export type ContentTypeKind = 'singleType' | 'collectionType';

/**
 * Literal union type representing the possible types of a model
 */
export type SchemaModelType = 'contentType' | 'component';

/**
 * Data structure that can either represent a content type or a component
 */
export interface Schema {
  /**
   * The type of the model. Useful to discriminate content-types from component
   */
  modelType: SchemaModelType;

  /**
   * Informations about schema naming and display
   */
  info: SchemaInfo;

  /**
   * Map of all the attributes with their name and definition
   */
  attributes: SchemaAttributes;

  /**
   * Options declared and read by the plugins
   */
  pluginOptions?: PluginOptions;

  /**
   * Options object dedicated to Strapi core features
   */
  options?: SchemaOptions;

  /**
   * Custom table name for the schema
   */
  collectionName?: string;
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
   * Singular form of the content type name
   */
  singularName?: string;

  /**
   * Plural form of the collection type name
   */
  pluralName?: string;

  /**
   * Description of the model
   */
  description?: string;

  /**
   * FontAwesome (v5) icon name to use for the component's icon in the admin panel
   */
  icon?: string;
}

/**
 * Low level data structure referencing every schema attribute and its name
 */
export interface SchemaAttributes extends StringRecord<Attribute> {}

/**
 * Structure containing every core schema options and their associated value
 */
export interface SchemaOptions {
  draftAndPublish?: boolean;
  populateCreatorFields?: boolean;
  comment?: string;
}

export interface PluginOptions {}

/**
 * Schema for a content type
 */
export interface ContentTypeSchema extends Schema {
  modelType: 'contentType';

  /**
   * Determine the type of the content type (single-type or collection-type)
   */
  kind: ContentTypeKind;
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
}

/**
 * Map of UID / schemas used as a schemas database for other types.
 * It must be extended by the user application or plugins.
 * 
 * @example
 * ```ts
 * declare module '@strapi/strapi/lib/types/core/schemas' {
 *   export interface Schemas {
 *     'xxx::xxx.uid': ContentTypeSchema | ComponentSchema;
 *   }
 * }
 * ```
 */
export interface Schemas {
  [key: string]: ContentTypeSchema | ComponentSchema
}

/**
 * Literal union type of every content type registered in Schemas
 */
export type ContentTypeUIDs = KeysBy<Schemas, ContentTypeSchema>;

/**
 * Literal union type of every collection type registered in Schemas
 */
export type CollectionTypeUIDs = KeysBy<Schemas, CollectionTypeSchema>;

/**
 * Literal union type of every single type registered in Schemas
 */
export type SingleTypeUIDs = KeysBy<Schemas, SingleTypeSchema>;

/**
 * Literal union type of every component registered in Schemas
 */
export type ComponentUIDs = KeysBy<Schemas, ComponentSchema>;
