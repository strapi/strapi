import type { Attribute, Common } from '../..';

/**
 * Literal union type representing the possible natures of a content type
 */
export type ContentTypeKind = 'singleType' | 'collectionType';

/**
 * Literal union type representing the possible types of a model
 */
export type ModelType = 'contentType' | 'component';

/**
 * Data structure that can either represent a content type or a component
 */
export interface Schema {
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
   * Map of all the attributes with their name and definition
   */
  attributes: Attributes;

  /**
   * Options declared and read by the plugins
   */
  pluginOptions?: PluginOptions;

  /**
   * Options object dedicated to Strapi core features
   */
  options?: Options;

  /**
   * Custom table name for the schema
   */
  collectionName?: string;

  /**
   * Information about schema naming and display
   */
  info: Info;
}

/**
 * Data structure containing naming and display information for a Schema
 */
export interface Info {
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

/**
 * Low level data structure referencing every schema attribute and its name
 */
export interface Attributes {
  [key: string]: Attribute.Any;
}

/**
 * Structure containing every core schema options and their associated value
 */
export interface Options {
  /**
   * EE only.
   */
  reviewWorkflows?: boolean;
  draftAndPublish?: boolean;
  populateCreatorFields?: boolean;
  comment?: string;
  version?: string;
}

export interface PluginOptions {
  i18n?: { localized: boolean };
}

/**
 * Schema for a content type
 */
export interface ContentType extends Schema {
  modelType: 'contentType';

  /**
   * Unique identifier of the schema
   */
  uid: Common.UID.ContentType;

  /**
   * Determine the type of the content type (single-type or collection-type)
   */
  kind: ContentTypeKind;

  /**
   * Information about schema naming and display
   */
  info: ContentTypeInfo;
}

export interface ContentTypeInfo extends Info {
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
export interface CollectionType extends ContentType {
  kind: 'collectionType';
}

/**
 * Schema for a single type
 */
export interface SingleType extends ContentType {
  kind: 'singleType';
}

/**
 * Schema for a component
 */
export interface Component extends Schema {
  modelType: 'component';

  uid: Common.UID.Component;

  category: string;
}

export type Any = SingleType | CollectionType | Component;
