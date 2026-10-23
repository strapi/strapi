import type { Schema, Struct, UID } from '@strapi/types';

/** The `api-handler` service: backs up, restores and removes the API folders of content types. */
export type ApiHandlerService = {
  /**
   * Deletes the API folder of a content type, then its backup unless `preserveBackup` is set.
   * Does nothing for a content type without an API, such as a plugin content type. Rejects when the
   * API folder is already gone.
   *
   * @internal
   */
  clear(uid: UID.ContentType, options?: { preserveBackup?: boolean }): Promise<void>;
  /**
   * Deletes the backup of a content type's API folder once the schema change has been written.
   *
   * @internal
   */
  finalize(uid: UID.ContentType): Promise<void>;
  /**
   * Copies the API folder of a content type to a backup that {@link ApiHandlerService.rollback}
   * restores. Does nothing for a content type without an API, such as a plugin content type.
   *
   * @internal
   */
  backup(uid: UID.ContentType): Promise<void>;
  /**
   * Restores the API folder of a content type from its backup. Rejects when the content type has no
   * backup.
   *
   * @internal
   */
  rollback(uid: UID.ContentType): Promise<void>;
  /**
   * Removes the API folder generated for a new content type before its schema change is written.
   *
   * @internal
   */
  clearGenerated(apiName: string): Promise<void>;
};

/** The `builder` service: the names that content types and attributes cannot use. */
export type BuilderService = {
  /**
   * The reserved attribute names, as `@strapi/utils` lists them.
   *
   * @internal
   */
  reservedAttributes: string[];
  /**
   * The reserved model names, as `@strapi/utils` lists them.
   *
   * @internal
   */
  reservedModels: string[];
  /**
   * Returns the reserved model and attribute names.
   *
   * @internal
   */
  getReservedNames(): { models: string[]; attributes: string[] };
  /**
   * Whether a content type or component cannot use this name.
   *
   * @internal
   */
  isReservedModelName(name: string): boolean;
  /**
   * Whether an attribute cannot use this name.
   *
   * @internal
   */
  isReservedAttributeName(name: string): boolean;
};

/** The `component-categories` service: renames and deletes component categories. */
export type ComponentCategoriesService = {
  /**
   * Renames a category and moves its components to the new category folder. The new name is
   * slugified.
   *
   * Rejects with an `ApplicationError` when the category does not exist or the new name is taken.
   *
   * @returns The new category name, or `undefined` when the slugified name is unchanged and nothing
   * was written.
   *
   * @internal
   */
  editCategory(name: string, infos: { name: string }): Promise<string | undefined>;
  /**
   * Deletes a category and its components. Rejects with an `ApplicationError` when the category does
   * not exist.
   *
   * @internal
   */
  deleteCategory(name: string): Promise<void>;
};

/**
 * The `content-structure` service: validates and writes the content-type groups (`groups.json`)
 * that a schema update sends.
 */
export type ContentStructureService = {
  /**
   * Checks that every content type a structure references exists and sits in the section of its
   * kind. Throws an `ApplicationError` that names every offending uid.
   *
   * @param structure - A content structure, as `groups.json` holds it; missing sections and groups
   * count as empty.
   * @param contentTypeUids - The kind of each content type the structure may reference, by uid.
   * @internal
   */
  validateContentTypeUidReferences(
    structure: unknown,
    contentTypeUids: Map<string, Struct.ContentTypeKind>
  ): void;
  /**
   * Checks the structure of a schema update against the content types the update keeps. Throws an
   * `ApplicationError` when the structure references a content type that does not exist or sits in
   * the wrong section. Does nothing when the update has no structure (`undefined` or `null`).
   *
   * @param input - The update's structure, the kinds of the content types it creates or updates, by
   * uid, and the uids it deletes.
   * @internal
   */
  validateFromUpdate(input: {
    incomingStructure?: unknown;
    upsertedUids: Map<string, Struct.ContentTypeKind>;
    deletedUids: Set<string>;
  }): void;
  /**
   * Writes the structure of a schema update, or removes the deleted uids from the stored structure
   * when the update has none.
   *
   * @returns Whether the structure file was written.
   * @internal
   */
  commitFromUpdate(input: {
    incomingStructure?: unknown;
    deletedUids: Set<string>;
  }): Promise<boolean>;
};

/**
 * An attribute in a Content-Type Builder payload. Besides schema attributes, it accepts the
 * references the builder resolves while it writes the schema.
 */
export type AttributeInput =
  | Schema.Attribute.AnyAttribute
  | {
      type: string;
      /**
       * The uid of the target content type. In a component sent with a new content type,
       * `'__contentType__'` targets that new content type.
       */
      target?: string;
      /** A component uid, or the `tmpUID` of a component sent in the same payload. */
      component?: string;
      /** Component uids, or the `tmpUID`s of components sent in the same payload. */
      components?: string[];
      [property: string]: unknown;
    };

/** A content type in a Content-Type Builder payload: the `info` fields sit at the top level. */
export type ContentTypeInput = {
  displayName: string;
  singularName: string;
  pluralName: string;
  kind?: Struct.ContentTypeKind;
  description?: string;
  draftAndPublish?: boolean;
  options?: Struct.SchemaOptions;
  pluginOptions?: Struct.SchemaPluginOptions;
  collectionName?: string;
  attributes: Record<string, AttributeInput>;
};

/** A component in a Content-Type Builder payload: the `info` fields sit at the top level. */
export type ComponentInput = {
  category: string;
  displayName: string;
  icon?: string;
  description?: string;
  options?: Struct.SchemaOptions;
  pluginOptions?: Struct.SchemaPluginOptions;
  collectionName?: string;
  attributes: Record<string, AttributeInput>;
};

/**
 * A component sent along with a content type or component: an existing component to update (by
 * `uid`), or a new one with a temporary uid that attributes in the same payload can reference.
 */
export type NestedComponentInput = ComponentInput &
  ({ uid: UID.Component; tmpUID?: never } | { tmpUID: string; uid?: never });

/** The payload that creates a content type, with the components it creates or updates. */
export type CreateContentTypePayload = {
  contentType: ContentTypeInput;
  components?: NestedComponentInput[] | undefined;
};

/**
 * The payload that updates a content type, with the components it creates or updates.
 * `attributes` replaces the configurable attributes, and `options` with `draftAndPublish` replace
 * the stored options. Left out, `displayName`, `description`, `kind` and `pluginOptions` keep their
 * current value. The singular, plural and collection names do not change.
 */
export type EditContentTypePayload = {
  contentType: Partial<Omit<ContentTypeInput, 'attributes'>> & Pick<ContentTypeInput, 'attributes'>;
  components?: NestedComponentInput[] | undefined;
};

/**
 * A content type that a Content-Type Builder mutation wrote, created or deleted. `schema` is the
 * content of its `schema.json` file, not the loaded schema of `strapi.contentTypes`.
 */
export type ContentTypeHandler = {
  readonly uid: UID.ContentType;
  readonly kind: Struct.ContentTypeKind;
  /** The singular name of the content type. */
  readonly modelName: string;
  /** The plugin of a plugin content type that existed before the mutation, else `undefined`. */
  readonly plugin: string | undefined;
  /** Whether the builder writes its file: `false` for admin content types. */
  readonly writable: boolean;
  readonly schema: Pick<
    Struct.ContentTypeSchema,
    | 'kind'
    | 'collectionName'
    | 'info'
    | 'options'
    | 'pluginOptions'
    | 'attributes'
    | 'indexes'
    | 'foreignKeys'
  >;
};

/**
 * A component that a Content-Type Builder mutation wrote, created or deleted. `schema` is the
 * content of its JSON file, not the loaded schema of `strapi.components`.
 */
export type ComponentHandler = {
  readonly uid: UID.Component;
  /** The model name of a component that existed before the mutation, else `undefined`. */
  readonly modelName: string | undefined;
  /** Set to the model name for a component that existed before the mutation, else `undefined`. */
  readonly plugin: string | undefined;
  /** The category of a component that existed before the mutation, else `undefined`. */
  readonly category: string | undefined;
  /** Whether the builder writes its file. */
  readonly writable: boolean;
  readonly schema: Pick<
    Struct.ComponentSchema,
    'collectionName' | 'info' | 'options' | 'pluginOptions' | 'attributes'
  >;
};

/**
 * An attribute as the Content-Type Builder admin reads it. Relations also carry the name of their
 * inverse attribute, or `null` for a one-way relation.
 */
export type FormattedAttribute =
  | Exclude<Schema.Attribute.AnyAttribute, { type: 'relation' }>
  | (Extract<Schema.Attribute.AnyAttribute, { type: 'relation' }> & {
      targetAttribute: string | null;
    });

/** A content type as the Content-Type Builder admin reads it. */
export type FormattedContentType = {
  uid: UID.ContentType;
  plugin: string | undefined;
  /** The singular name of the content type. */
  apiID: string;
  /** The schema options, then the `info` fields, kind and visible attributes of the content type. */
  schema: Struct.SchemaOptions & {
    draftAndPublish: boolean;
    displayName: string;
    singularName: string;
    pluralName: string;
    /** An empty string when the content type has no description. */
    description: string;
    pluginOptions: Struct.SchemaPluginOptions | undefined;
    kind: Struct.ContentTypeKind;
    collectionName: string | undefined;
    attributes: Record<string, FormattedAttribute>;
    /** `false` when the `content-type-builder` plugin options hide the content type. */
    visible: boolean;
    /** The relations other content types may create to this one, or `null` for any relation. */
    restrictRelationsTo: string[] | null;
  };
};

/**
 * The `content-types` service: formats content types for the admin and creates, updates and
 * deletes the content types of the application.
 */
export type ContentTypesService = {
  /**
   * Whether the Content-Type Builder owns the content type: application content types (`api::`)
   * only.
   *
   * @internal
   */
  isCTBOwnedApplicationContentType(uid: UID.ContentType): boolean;
  /**
   * Throws an `ApplicationError` when the content type is not an application content type.
   *
   * @internal
   */
  assertCTBOwnedApplicationContentType(uid: UID.ContentType): void;
  /**
   * Whether the Content-Type Builder shows the content type: `false` when its
   * `content-type-builder` plugin options set `visible` to anything but `true`.
   *
   * @internal
   */
  isContentTypeVisible(model: Struct.ContentTypeSchema): boolean;
  /**
   * The relations other content types may create to this one: one-way relations only for admin
   * users, none for core (`strapi::`), upload file and hidden content types, or `null` for any
   * relation.
   *
   * @internal
   */
  getRestrictRelationsTo(contentType: Struct.ContentTypeSchema): string[] | null;
  /** Formats a loaded content type for the Content-Type Builder admin. */
  formatContentType(contentType: Struct.ContentTypeSchema): FormattedContentType;
  /**
   * Creates several content types and their API folders, writes the schema files once, then emits
   * `content-type.create` for each. Restores the files and removes the generated API folders when a
   * step fails.
   */
  createContentTypes(contentTypes: CreateContentTypePayload[]): Promise<ContentTypeHandler[]>;
  /**
   * Creates a content type with the components sent with it, generates its API folder, writes the
   * schema files and emits `content-type.create`. Restores the files and removes the generated API
   * folder when a step fails.
   *
   * @param options - `generatedApiNames` collects the singular names of the generated API folders;
   * `deferEvent` skips the event.
   */
  createContentType(
    payload: CreateContentTypePayload,
    options?: { generatedApiNames?: string[]; deferEvent?: boolean }
  ): Promise<ContentTypeHandler>;
  /**
   * Generates the API folder (routes, controller, service) of a new application content type.
   *
   * @internal
   */
  generateAPI(input: {
    singularName: string;
    pluralName: string;
    displayName: string;
    kind?: Struct.ContentTypeKind;
  }): Promise<{ success: boolean }>;
  /**
   * Updates an existing content type and the components sent with it, writes the schema files and
   * emits `content-type.update`. A kind change regenerates the API folder and emits no event; it
   * rejects with an `ApplicationError` when a collection type with several entries would become a
   * single type.
   */
  editContentType(
    uid: UID.ContentType,
    payload: EditContentTypePayload
  ): Promise<ContentTypeHandler>;
  /**
   * Deletes application content types, their API folders and their references in other schemas,
   * then emits `content-type.delete` for each. Rejects with an `ApplicationError`, before any
   * change, when a uid is not an application content type.
   */
  deleteContentTypes(uids: UID.ContentType[]): Promise<void>;
  /**
   * Deletes an application content type, its API folder and its references in other schemas, then
   * emits `content-type.delete`. Rejects with an `ApplicationError` when the uid is not an
   * application content type.
   *
   * @returns The deleted content type.
   */
  deleteContentType(uid: UID.ContentType): Promise<ContentTypeHandler>;
};
