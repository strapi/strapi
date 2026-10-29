import type { Core } from '@strapi/types';
import { AbstractRouteValidator, type QueryParam } from '@strapi/utils';
import * as z from 'zod/v4';

export type FileQueryParam = QueryParam;

/**
 * UploadRouteValidator provides validation for upload/file routes.
 *
 * Extends the AbstractRouteValidator to inherit common query parameter validation
 * while adding file-specific validation schemas.
 */
export class UploadRouteValidator extends AbstractRouteValidator {
  protected readonly _strapi: Core.Strapi;

  public constructor(strapi: Core.Strapi) {
    super();
    this._strapi = strapi;
  }

  /**
   * File schema for upload responses
   * Defines the structure of a file object returned by the upload API
   */
  get file() {
    return z.object({
      id: this.fileId,
      documentId: z.uuid(),
      name: z.string(),
      alternativeText: z.string().nullable().optional(),
      caption: z.string().nullable().optional(),
      width: z.number().int().optional(),
      height: z.number().int().optional(),
      formats: z.record(z.string(), z.unknown()).optional(),
      hash: z.string(),
      ext: z.string().optional(),
      mime: z.string(),
      size: z.number(),
      url: z.string(),
      previewUrl: z.string().nullable().optional(),
      folder: z.number().optional(),
      folderPath: z.string(),
      provider: z.string(),
      provider_metadata: z.record(z.string(), z.unknown()).nullable().optional(),
      createdAt: z.string(),
      updatedAt: z.string(),
      createdBy: z.number().optional(),
      updatedBy: z.number().optional(),
    });
  }

  /**
   * Array of files schema
   */
  get files() {
    return z.array(this.file);
  }

  /**
   * Paginated files response schema: `{ data, meta: { pagination } }`.
   */
  get paginatedFiles() {
    return z.object({
      data: this.files,
      meta: z.object({ pagination: this.paginationMeta }),
    });
  }

  /**
   * Pagination meta is either page-based (`page`/`pageSize`) or offset-based
   * (`start`/`limit`), and `total`/`pageCount` are omitted when
   * `pagination[withCount]=false`.
   */
  get paginationMeta() {
    const pagedPagination = z.object({
      page: z.number().int(),
      pageSize: z.number().int(),
      pageCount: z.number().int().optional(),
      total: z.number().int().optional(),
    });

    const offsetPagination = z.object({
      start: z.number().int(),
      limit: z.number().int(),
      total: z.number().int().optional(),
    });

    return z.union([pagedPagination, offsetPagination]);
  }

  /**
   * Folder schema for the read-only folders routes. `path` is made of `pathId`s and is only
   * meant as a subtree filter key; `namePath` is the same path made of folder names.
   */
  get folder() {
    const parent = z.object({ id: z.number().int().positive(), documentId: z.string() });

    return z.object({
      id: z.number().int().positive(),
      documentId: z.string(),
      name: z.string(),
      path: z.string(),
      namePath: z.string(),
      parent: parent.nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
    });
  }

  /**
   * Content API folder lookup parameter: a numeric id or a documentId
   */
  get folderIdOrDocumentId() {
    return z.union([z.number().int().positive(), z.string()]);
  }

  get paginatedFolders() {
    return z.object({
      data: z.array(this.folder),
      meta: z.object({ pagination: this.paginationMeta }),
    });
  }

  /**
   * File ID parameter validation
   */
  get fileId() {
    return z.number().int().positive();
  }

  /**
   * Content API file lookup parameter: a numeric id or a documentId
   */
  get fileIdOrDocumentId() {
    return z.union([this.fileId, z.string()]);
  }

  /**
   * Upload request body schema for single file uploads
   */
  get uploadBody() {
    return z.object({
      fileInfo: z
        .object({
          name: z.string().optional(),
          alternativeText: z.string().optional(),
          caption: z.string().optional(),
        })
        .optional(),
    });
  }

  /**
   * Upload request body schema for multiple file uploads
   */
  get multiUploadBody() {
    return z.object({
      fileInfo: z
        .array(
          z.object({
            name: z.string().optional(),
            alternativeText: z.string().optional(),
            caption: z.string().optional(),
          })
        )
        .optional(),
    });
  }

  // Note: queryParams() method is inherited from AbstractRouteValidator
  // and provides validation for ['fields', 'populate', 'sort', 'pagination', 'filters']
}
