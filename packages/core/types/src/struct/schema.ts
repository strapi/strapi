import type { Attribute } from '../schema';
import type * as UID from '../uid';

export type ContentTypeKind = 'collectionType' | 'singleType';

export type ModelType = 'contentType' | 'component';

export type Schema = ContentTypeSchema | ComponentSchema;

/**
 * A loaded instance of a Strapi Schema accessible to the server.
 */
export interface BaseSchema {
  /**
   * The unique identifier of the Schema. This identifier is a combined type encompassing both ContentType and Component UID types.
   *
   * It is mainly used when dealing with either content types or components in a situation where the context is not specific.
   */
  uid: UID.Schema;

  /**
   * This is an identifier type that helps differentiate between a 'contentType' and 'component'.
   * This distinction aids in communication where the ModelType needs to be specified explicitly.
   */
  modelType: ModelType;

  /**
   * Serves as the public name of the schema. Often utilized in referencing a specific schema (e.g. in the database).
   */
  modelName: string;

  /**
   * This global identifier acts as a unique reference to the schema across varying scopes and contexts.
   */
  globalId: string;

  /**
   * Contains options specific to plugins. It is an optional property and stores configurations that are read by the plugins associated with this Schema.
   */
  pluginOptions?: SchemaPluginOptions;

  /**
   * Encapsulates all core options related to Strapi features for a given Schema.
   */
  options?: SchemaOptions;

  /**
   * Optional property. Specifies the custom table name for the Schema if any.
   */
  collectionName?: string;

  /**
   * Contains information related to naming and display characteristics of the Schema.
   */
  info: SchemaInfo;

  /**
   * Houses a comprehensive collection of attributes for this Schema.
   *
   * Each attribute has a unique string key and corresponding value should be any Attribute type instance.
   */
  attributes: SchemaAttributes;
}

/**
 * Comprises naming and display parameters to customize a Schema's representation.
 */
export interface SchemaInfo {
  /**
   * Sets the default nomenclature for the Admin Panel. Acts as the label while identifying
   * the schema or interacting with it within the admin panel. For example, used as a label
   * for fields, table columns, and menu items.
   */
  displayName: string;

  /**
   * Delineates the purpose of the model, clarifying its intended usage or its function. This
   * property is optional and is primarily meant for further documentation to provide better
   * context and understanding of the schema.
   */
  description?: string;

  /**
   * Specifies the visual identifier - an icon, for the schema inside the admin panel. It eases
   * recognition and improves navigation. The value should be any valid @strapi/icon name. This
   * property is optional, and if omitted, a default icon might be used by the interface.
   */
  icon?: string;
}

/**
 * `SchemaAttributes` is a mapping of attribute keys to their corresponding values.
 *
 * These keys and values define the structure and characteristics of a Strapi schema.
 */
export type SchemaAttributes = Record<string, Attribute.AnyAttribute>;

/**
 * Contains various options employed during runtime to tweak certain aspects of Strapi features.
 *
 * Each property under this interface can enable, disable or modify a specific feature or functionality associated with a schema.
 */
export interface SchemaOptions {
  /**
   * Toggles the review workflow feature on or off.
   *
   * A review workflow is a process that describes the stages a document must go through from creation to publication.
   *
   * @remark This option is Enterprise Edition Exclusive.
   */
  reviewWorkflows?: boolean;

  /**
   * Determines if creator fields can be populated.
   *
   * When enabled, this feature will allow populating data about the admin user who created a specific document entry.
   */
  populateCreatorFields?: boolean;

  /**
   * May be used for providing specific notes or annotations of the schema.
   */
  comment?: string;

  /**
   * Can be utilized for setting a particular version of schema related to the review-workflow feature.
   *
   * @deprecated As of v5, this is deprecated and will likely be removed soon.
   */
  version?: string;

  /**
   * Used to enable or disable the draft and publish feature.
   * This would decide whether the changes made to a document are published immediately or saved as a draft for later.
   */
  draftAndPublish?: boolean;
}

/**
 * Provides a flexible configuration method for Strapi plugins.
 *
 * In Strapi, plugins extend the core functionality and enhance features of the application. Each plugin may require
 * prerequisite settings or configurations for successful functioning. `SchemaPluginOptions` facilitates this by storing these configurations
 * as key-value pairs where the key corresponds to the name of the plugin, and the value defines the respective settings of that plugin.
 *
 * @remark The keys/values of configurations are not explicitly defined and are manually defined in each schema definition.
 *
 * @example
 * Using `SchemaPluginOptions` in the schema definition:
 *
 * ```typescript
 * import type { Struct } from '@strapi/types';
 *
 * const strapiPluginOptions: Struct.SchemaPluginOptions = {
 *   'plugin-foo': {
 *     prop1: string;
 *     prop2: boolean;
 *   },
 *   'plugin-bar': {
 *     prop1: string;
 *     prop2: boolean;
 *   },
 * };
 *
 * const articleSchema: Struct.BaseSchema = {
 *   uid: 'article',
 *   modelType: 'contentType',
 *   modelName: 'Article',
 *   globalId: 'Article',
 *   pluginOptions: strapiPluginOptions,
 *   // Other schema properties...
 * };
 * ```
 *
 */
export interface SchemaPluginOptions {
  [key: string]: unknown;
}

/**
 * Serves as a layout for a content type.
 *
 * Inherits and enhances various properties from the `BaseSchema`, the `ContentTypeSchema` is a unique derivative of the base schema that distinguishes itself with additional properties.
 */
export interface ContentTypeSchema extends BaseSchema {
  /**
   * Forces the `modelType` to be a `contentType`.
   *
   * @remark Helpful to distinguish a {@link ContentTypeSchema} from a {@link ComponentSchema}
   */
  modelType: 'contentType';

  /**
   * Unique identifier associated with the content type. It acts as a reference to work with data structures that are specifically identified by the content type's UID.
   */
  uid: UID.ContentType;

  /**
   * Classifies the content type as 'collection-type' or 'single-type'.
   */
  kind: ContentTypeKind;

  /**
   * Brings together attributes related to naming and display characteristics like singular name and plural name of the content type. These names are typically used in user interfaces where these entries are displayed.
   */
  info: ContentTypeSchemaInfo;

  /**
   * Optional attribute to indicate the indexes to be created on the database for this content type.
   *
   * @internal
   */
  indexes?: unknown[];

  /**
   * Optional attribute to indicate the foreignKeys to be created on the database for this content type.
   *
   * @internal
   */
  foreignKeys?: unknown[];
}

/**
 * Contains naming properties specific to a specific content type.
 */
export interface ContentTypeSchemaInfo extends SchemaInfo {
  /**
   * Indicates how a single instance of the content type should be labeled.
   */
  singularName: string;

  /**
   * Provides a human-friendly label for referring to multiple instances of the content type.
   */
  pluralName: string;
}

/**
 * Schema that represents a collection of content types' entry in the system.
 */
export interface CollectionTypeSchema extends ContentTypeSchema {
  /**
   * Explicitly sets the kind of content type schema to 'collectionType'.
   *
   * This signifies that the content type is organized in a collection, handling multiple entries.
   */
  kind: 'collectionType';
}

/**
 * Schema that represents a single of content type's entry in the system.
 */
export interface SingleTypeSchema extends ContentTypeSchema {
  /**
   * Explicitly sets the kind of content type schema to 'singleType'.
   *
   * This signifies that the content type has a single entry.
   */
  kind: 'singleType';
}

/**
 * Serves as a layout for a component type.
 *
 * Inherits and enhances various properties from the `BaseSchema`, the `ComponentSchema` is a unique derivative of the base schema that distinguishes itself with additional properties.
 */
export interface ComponentSchema extends BaseSchema {
  /**
   * Forces the `modelType` to be a `component`.
   *
   * @remark Helpful to distinguish a {@link ComponentSchema} from a {@link ContentTypeSchema}
   */
  modelType: 'component';

  /**
   * A unique identifier for the component.
   *
   * It uses `UID.Component` type which encapsulates unique identifiers for any component defined in the public component registry.
   */
  uid: UID.Component;

  /**
   * A classification field for the component.
   *
   * This string type field is utilized to categorize components into different categories based on their function or feature.
   */
  category: string;
}
