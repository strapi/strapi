import type { Struct, UID } from '@strapi/types';

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
